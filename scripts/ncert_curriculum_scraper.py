#!/usr/bin/env python3
"""
NCERT & CBSE Textbook Scraper, PDF Extractor & Tabular Curriculum Pipeline
--------------------------------------------------------------------------
Scrapes NCERT textbook portal (https://ncert.nic.in/textbook.php) to extract:
  - Classes (1 to 12)
  - Subjects (Science, Mathematics, Social Science, Physics, Chemistry, etc.)
  - Book Titles, Book Codes, and direct Chapter PDF links.
  - Downloads chapter PDFs into a clean, human-readable directory hierarchy:
      data/ncert_pdfs/Class_09/Mathematics/Ganita_Manjari/Chapter_01_iemh1.pdf
  - Extracts clean text using PyMuPDF (fitz),
  - Stores data into a modern SQLite tabular database (`data/curriculum_store.sqlite`),
  - Exports a hierarchical JSON catalog (`data/curriculum_catalog.json`),
  - Synchronizes the local study-source CSV (`data/study-source/text_files_data2.csv`)
    to maintain 100% backward compatibility with the study backend.
  - Provides a built-in `--validate` command to cross-verify database text against source PDFs.

Usage:
  python scripts/ncert_curriculum_scraper.py --run-now --classes 9 10
  python scripts/ncert_curriculum_scraper.py --run-now --classes all (scales across Class 1 to 12)
  python scripts/ncert_curriculum_scraper.py --sample (quick verification)
  python scripts/ncert_curriculum_scraper.py --validate (audit DB text vs physical PDFs)
  python scripts/ncert_curriculum_scraper.py --schedule-info (recurrent setup instructions)
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import shutil
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import urllib3

if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

csv.field_size_limit(sys.maxsize)
urllib3.disable_warnings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ncert_scraper")

NCERT_BASE_URL = "https://ncert.nic.in"
TEXTBOOK_PAGE = f"{NCERT_BASE_URL}/textbook.php"
PDF_BASE_URL = f"{NCERT_BASE_URL}/textbook/pdf"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PDF_DIR = DATA_DIR / "ncert_pdfs"
DB_PATH = DATA_DIR / "curriculum_store.sqlite"
CATALOG_JSON_PATH = DATA_DIR / "curriculum_catalog.json"
CATALOG_CACHE_PATH = DATA_DIR / "ncert_catalog_cache.html"
CSV_PATH = PROJECT_ROOT / "data" / "study-source" / "text_files_data2.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "close",
}


def sanitize_folder_name(name: str) -> str:
    """Sanitize directory or file name for Windows/Unix compatibility."""
    clean = re.sub(r'[\\/*?:"<>|]', '_', name)
    clean = re.sub(r'\s+', '_', clean).strip('._ ')
    return clean or "General"


def init_database(db_path: Path) -> sqlite3.Connection:
    """Initialize SQLite database with structured tabular schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ncert_books (
                book_code TEXT PRIMARY KEY,
                board TEXT NOT NULL DEFAULT 'CBSE',
                grade TEXT NOT NULL,
                class_label TEXT NOT NULL,
                subject TEXT NOT NULL,
                book_title TEXT NOT NULL,
                total_chapters INTEGER NOT NULL DEFAULT 0,
                discovered_at TEXT NOT NULL
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ncert_chapters (
                id TEXT PRIMARY KEY,
                board TEXT NOT NULL DEFAULT 'CBSE',
                grade TEXT NOT NULL,
                class_label TEXT NOT NULL,
                subject TEXT NOT NULL,
                book_title TEXT NOT NULL,
                book_code TEXT NOT NULL,
                chapter_no INTEGER NOT NULL,
                chapter_title TEXT NOT NULL,
                pdf_url TEXT NOT NULL,
                local_pdf_path TEXT,
                file_data TEXT,
                char_count INTEGER DEFAULT 0,
                extracted_at TEXT NOT NULL,
                FOREIGN KEY (book_code) REFERENCES ncert_books(book_code) ON DELETE CASCADE
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ncert_grade_subject ON ncert_chapters(grade, subject);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ncert_book_chapter ON ncert_chapters(book_code, chapter_no);")
    return conn


def scrape_ncert_catalog(use_selenium: bool = False) -> list[dict[str, Any]]:
    """Discover all available books, subjects, and chapter counts from NCERT with caching & resilience."""
    logger.info("Fetching NCERT textbook catalog from %s ...", TEXTBOOK_PAGE)

    if use_selenium:
        return _scrape_via_selenium()

    html = ""
    # Try fetching with retries and connection handling
    for attempt in range(1, 4):
        try:
            resp = requests.get(TEXTBOOK_PAGE, headers=HEADERS, verify=False, timeout=25)
            if resp.status_code == 200 and len(resp.text) > 10000:
                html = resp.text
                DATA_DIR.mkdir(parents=True, exist_ok=True)
                with open(CATALOG_CACHE_PATH, "w", encoding="utf-8") as f:
                    f.write(html)
                break
        except Exception as e:
            logger.warning("Attempt %d to fetch NCERT catalog failed: %s", attempt, e)
            time.sleep(1.5)

    if not html and CATALOG_CACHE_PATH.exists():
        logger.info("Using cached NCERT catalog from %s", CATALOG_CACHE_PATH)
        with open(CATALOG_CACHE_PATH, "r", encoding="utf-8") as f:
            html = f.read()

    if not html:
        raise RuntimeError("Failed to download or load cached NCERT textbook catalog.")

    book_entries: list[dict[str, Any]] = []
    pattern = re.compile(
        r'else\s+if\s*\(\s*\(document\.test\.tclass\.value\s*==\s*(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text\s*==\s*"([^"]+)"\)\s*\)\s*\{(.*?)\}',
        re.DOTALL,
    )

    for class_val, subject, body in pattern.findall(html):
        book_matches = re.findall(
            r'document\.test\.tbook\.options\[\d+\]\.text\s*=\s*"([^"]+)";\s*document\.test\.tbook\.options\[\d+\]\.value\s*=\s*"textbook\.php\?([^"=]+)=(\d+)-(\d+)"',
            body,
        )
        for btext, bcode, start_ch, end_ch in book_matches:
            btext_clean = btext.strip()
            if btext_clean and "..Select" not in btext_clean and len(bcode) > 1 and bcode[1].lower() == 'e':
                book_entries.append({
                    "grade": class_val,
                    "class_label": f"Class {class_val}",
                    "subject": subject.strip(),
                    "title": btext_clean,
                    "code": bcode.strip(),
                    "chapters": int(end_ch),
                })

    logger.info("Successfully discovered %d textbook titles across all classes.", len(book_entries))
    return book_entries


def _scrape_via_selenium() -> list[dict[str, Any]]:
    """Fallback interactive scraper using Selenium WebDriver."""
    logger.info("Starting Selenium WebDriver mode...")
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import Select

    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--ignore-certificate-errors")

    driver = webdriver.Chrome(options=chrome_options)
    try:
        driver.get(TEXTBOOK_PAGE)
        time.sleep(2)
        html = driver.page_source
        pattern = re.compile(
            r'else\s+if\s*\(\s*\(document\.test\.tclass\.value\s*==\s*(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text\s*==\s*"([^"]+)"\)\s*\)\s*\{(.*?)\}',
            re.DOTALL,
        )
        book_entries = []
        for class_val, subject, body in pattern.findall(html):
            book_matches = re.findall(
                r'document\.test\.tbook\.options\[\d+\]\.text\s*=\s*"([^"]+)";\s*document\.test\.tbook\.options\[\d+\]\.value\s*=\s*"textbook\.php\?([^"=]+)=(\d+)-(\d+)"',
                body,
            )
            for btext, bcode, start_ch, end_ch in book_matches:
                btext_clean = btext.strip()
                if btext_clean and "..Select" not in btext_clean and len(bcode) > 1 and bcode[1].lower() == 'e':
                    book_entries.append({
                        "grade": class_val,
                        "class_label": f"Class {class_val}",
                        "subject": subject.strip(),
                        "title": btext_clean,
                        "code": bcode.strip(),
                        "chapters": int(end_ch),
                    })
        return book_entries
    finally:
        driver.quit()


def download_chapter_pdf(pdf_url: str, dest_path: Path, max_retries: int = 3) -> bool:
    """Download chapter PDF with streaming chunks, clean folder creation, and retries."""
    if dest_path.exists() and dest_path.stat().st_size > 1024:
        return True

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req_headers = dict(HEADERS)
    req_headers["Connection"] = "close"

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(pdf_url, headers=req_headers, verify=False, timeout=30, stream=True)
            if resp.status_code == 200:
                with open(dest_path, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=32768):
                        if chunk:
                            f.write(chunk)
                if dest_path.stat().st_size > 1024:
                    return True
            time.sleep(1)
        except Exception as e:
            logger.warning("Attempt %d failed for %s: %s", attempt, pdf_url, e)
            time.sleep(2)

    return False


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract and clean text from chapter PDF using PyMuPDF (fitz)."""
    if not fitz:
        logger.warning("PyMuPDF (fitz) is not installed; skipping PDF text extraction.")
        return ""

    try:
        doc = fitz.open(str(pdf_path))
        text_parts: list[str] = []

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text()

            cleaned_lines = []
            for line in text.splitlines():
                l = line.strip()
                if not l:
                    continue
                if re.search(r"reprint|rationalised|not to be republished|chapter\s+\d+|page\s+\d+", l, re.I):
                    continue
                cleaned_lines.append(l)

            if cleaned_lines:
                text_parts.append("\n".join(cleaned_lines))

        return "\n\n".join(text_parts).strip()
    except Exception as e:
        logger.error("Error reading PDF %s: %s", pdf_path, e)
        return ""


def migrate_existing_database_paths(conn: sqlite3.Connection) -> None:
    """Ensure all existing downloaded PDFs are organized into clean hierarchical folders."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, grade, subject, book_title, book_code, chapter_no, local_pdf_path
        FROM ncert_chapters
        WHERE local_pdf_path IS NOT NULL
    """)
    rows = cursor.fetchall()
    migrated_count = 0

    for cid, grade, subject, book_title, code, ch, old_path in rows:
        ch_str = f"{ch:02d}"
        safe_grade = f"Class_{int(grade):02d}" if grade.isdigit() else f"Class_{grade}"
        safe_subject = sanitize_folder_name(subject)
        safe_book = sanitize_folder_name(book_title)

        dest_dir = PDF_DIR / safe_grade / safe_subject / safe_book
        new_pdf_path = dest_dir / f"Chapter_{ch_str}_{code}.pdf"
        old_full_path = PROJECT_ROOT / old_path

        if old_full_path.exists() and str(new_pdf_path) != str(old_full_path):
            dest_dir.mkdir(parents=True, exist_ok=True)
            if not new_pdf_path.exists():
                shutil.copy2(old_full_path, new_pdf_path)
            new_rel = str(new_pdf_path.relative_to(PROJECT_ROOT))
            with conn:
                conn.execute("UPDATE ncert_chapters SET local_pdf_path = ? WHERE id = ?", (new_rel, cid))
            migrated_count += 1

    if migrated_count:
        logger.info("Organized %d existing PDFs into clean hierarchical folder structure.", migrated_count)


def run_pipeline(
    target_classes: set[str],
    target_subjects: set[str] | None = None,
    max_chapters_per_book: int | None = None,
    use_selenium: bool = False,
) -> None:
    """Run the complete scrape, download, extract, and tabular ingestion workflow."""
    conn = init_database(DB_PATH)
    migrate_existing_database_paths(conn)
    all_books = scrape_ncert_catalog(use_selenium=use_selenium)

    # Filter by requested classes and subjects
    selected_books = [
        b for b in all_books
        if b["grade"] in target_classes
        and (not target_subjects or b["subject"].lower() in {s.lower() for s in target_subjects})
    ]

    logger.info("Processing %d selected books for classes: %s", len(selected_books), sorted(target_classes, key=lambda x: int(x) if x.isdigit() else 999))

    now = datetime.now(timezone.utc).isoformat()

    # Save books to database
    with conn:
        for b in selected_books:
            conn.execute("""
                INSERT OR REPLACE INTO ncert_books
                (book_code, board, grade, class_label, subject, book_title, total_chapters, discovered_at)
                VALUES (?, 'CBSE', ?, ?, ?, ?, ?, ?)
            """, (b["code"], b["grade"], b["class_label"], b["subject"], b["title"], b["chapters"], now))

    total_chapters_extracted = 0

    for book in selected_books:
        grade = book["grade"]
        subject = book["subject"]
        code = book["code"]
        total_ch = book["chapters"]
        book_title = book["title"]

        ch_limit = min(total_ch, max_chapters_per_book) if max_chapters_per_book else total_ch

        # Structured Directory Hierarchy: data/ncert_pdfs/Class_09/Mathematics/Ganita_Manjari/
        safe_grade = f"Class_{int(grade):02d}" if grade.isdigit() else f"Class_{grade}"
        safe_subject = sanitize_folder_name(subject)
        safe_book = sanitize_folder_name(book_title)
        book_pdf_dir = PDF_DIR / safe_grade / safe_subject / safe_book
        book_pdf_dir.mkdir(parents=True, exist_ok=True)

        for ch in range(1, ch_limit + 1):
            ch_str = f"{ch:02d}"
            pdf_url = f"{PDF_BASE_URL}/{code}{ch_str}.pdf"
            dest_pdf = book_pdf_dir / f"Chapter_{ch_str}_{code}.pdf"

            # Check legacy flat location fallback
            legacy_pdf = PDF_DIR / f"class_{grade}" / subject.replace(" ", "_") / f"{code}_{ch_str}.pdf"
            if not dest_pdf.exists() and legacy_pdf.exists() and legacy_pdf.stat().st_size > 1024:
                shutil.copy2(legacy_pdf, dest_pdf)

            chapter_id = f"cbse_{grade}_{code}_ch{ch}"
            chapter_title = f"Chapter {ch}: {book_title}"

            downloaded = download_chapter_pdf(pdf_url, dest_pdf)
            extracted_text = ""

            if downloaded:
                extracted_text = extract_text_from_pdf(dest_pdf)
                lines = [line.strip() for line in extracted_text.splitlines() if len(line.strip()) > 3]
                if lines:
                    first_few = " — ".join(lines[:2])
                    if len(first_few) < 80:
                        chapter_title = f"Chapter {ch}: {first_few}"

            char_count = len(extracted_text)

            with conn:
                conn.execute("""
                    INSERT OR REPLACE INTO ncert_chapters
                    (id, board, grade, class_label, subject, book_title, book_code, chapter_no,
                     chapter_title, pdf_url, local_pdf_path, file_data, char_count, extracted_at)
                    VALUES (?, 'CBSE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    chapter_id, grade, f"Class {grade}th", subject, book_title, code, ch,
                    chapter_title, pdf_url, str(dest_pdf.relative_to(PROJECT_ROOT)) if downloaded else None,
                    extracted_text, char_count, now
                ))

            total_chapters_extracted += 1
            logger.info("Ingested: [%s] %s > %s > Ch %d (%d chars)", safe_grade, subject, book_title, ch, char_count)

    # Export Hierarchical JSON Catalog
    export_json_catalog(conn, CATALOG_JSON_PATH)

    logger.info("Pipeline completed successfully! Total chapters indexed: %d", total_chapters_extracted)
    logger.info("Database saved to: %s", DB_PATH)
    logger.info("Catalog JSON saved to: %s", CATALOG_JSON_PATH)


def export_json_catalog(conn: sqlite3.Connection, out_path: Path) -> None:
    """Generate lightweight JSON catalog for frontend, dynamically handling all grades Class 1 to 12."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT grade, class_label, subject, book_title, chapter_no, chapter_title, pdf_url, char_count
        FROM ncert_chapters
        ORDER BY CAST(grade AS INTEGER), subject, chapter_no
    """)

    classes_map: dict[str, dict[str, Any]] = {}
    for grade, class_label, subject, book_title, ch_no, ch_title, pdf_url, char_count in cursor.fetchall():
        if grade not in classes_map:
            classes_map[grade] = {"grade": grade, "class_label": class_label, "subjects": {}}
        subj_map = classes_map[grade]["subjects"]
        if subject not in subj_map:
            subj_map[subject] = {"board": "CBSE", "subject": subject, "books": {}, "chapters": []}
        subj_map[subject]["chapters"].append(ch_title)
        if book_title not in subj_map[subject]["books"]:
            subj_map[subject]["books"][book_title] = []
        subj_map[subject]["books"][book_title].append({
            "chapter_no": ch_no,
            "title": ch_title,
            "pdf_url": pdf_url,
            "char_count": char_count,
        })

    structured_classes = []
    all_grades = sorted(classes_map.keys(), key=lambda g: int(g) if g.isdigit() else 999)
    for grade in all_grades:
        item = classes_map[grade]
        subjects_list = []
        for sname, sdata in sorted(item["subjects"].items()):
            subjects_list.append({
                "board": sdata["board"],
                "subject": sname,
                "chapters": sdata["chapters"],
                "books": sdata["books"],
            })
        structured_classes.append({
            "grade": grade,
            "class_label": item["class_label"],
            "subjects": subjects_list,
        })

    output_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "NCERT Official Portal (https://ncert.nic.in/textbook.php)",
        "classes": structured_classes,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)


def sync_csv_curriculum(conn: sqlite3.Connection, out_path: Path) -> None:
    """Export the indexed catalogue to a portable CSV without overwriting source files.

    `data/study-source/text_files_data2.csv` is an imported source and must stay
    intact. This export is for inspection or a deliberate adapter migration.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT class_label, subject, chapter_title, file_data, board
        FROM ncert_chapters
        ORDER BY CAST(grade AS INTEGER), subject, chapter_no
    """)
    with out_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Class", "Subject", "Chapter", "File_Data", "Board"])
        writer.writeheader()
        for class_label, subject, chapter_title, file_data, board in cursor.fetchall():
            writer.writerow({"Class": class_label, "Subject": subject, "Chapter": chapter_title, "File_Data": file_data or "", "Board": board or "CBSE"})





def display_schedule_instructions() -> None:
    """Print 6-month automated recurrence schedule instructions for cron and Windows Task Scheduler."""
    print("=" * 70)
    print("NCERT & CBSE CURRICULUM SCRAPER — 6-MONTH RECURRENCE SCHEDULE")
    print("=" * 70)
    print("\n1. Standard Cron Expression (Runs every 6 months on the 1st at midnight):")
    print("   0 0 1 */6 * python /path/to/papershapers/scripts/ncert_curriculum_scraper.py --run-now")
    print("\n2. Windows Task Scheduler PowerShell Command (Creates semi-annual task):")
    print(r'   $Action = New-ScheduledTaskAction -Execute "python.exe" -Argument "c:\papershapers\scripts\ncert_curriculum_scraper.py --run-now"')
    print(r'   $Trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 26 -DaysOfWeek Sunday -At 3am')
    print(r'   Register-ScheduledTask -TaskName "PaperShapers_NCERT_Curriculum_Sync" -Action $Action -Trigger $Trigger')
    print("\n3. Manual Trigger Commands:")
    print("   python scripts/ncert_curriculum_scraper.py --run-now --classes 9 10 11 12")
    print("   python scripts/ncert_curriculum_scraper.py --run-now --classes all (scale Class 1 to 12)")
    print("   python scripts/ncert_curriculum_scraper.py --validate (verify text matches source PDFs)")
    print("=" * 70)


def main() -> None:
    parser = argparse.ArgumentParser(description="NCERT & CBSE Curriculum Scraper and Extractor")
    parser.add_argument("--run-now", action="store_true", help="Execute scraper immediately")
    parser.add_argument("--sample", action="store_true", help="Run quick sample extraction for verification")
    parser.add_argument("--validate", action="store_true", help="Cross-validate extracted text against source PDFs")
    parser.add_argument("--selenium", action="store_true", help="Use Selenium WebDriver mode")
    parser.add_argument("--classes", nargs="+", default=["9", "10", "11", "12"], help="Grades to scrape (e.g. 9 10 11 12, or 'all' for Class 1 to 12)")
    parser.add_argument("--subjects", nargs="+", default=None, help="Subjects to filter (e.g. Science Mathematics)")
    parser.add_argument("--max-chapters-per-book", type=int, default=None, help="Cap chapters downloaded per book")
    parser.add_argument("--schedule-info", action="store_true", help="Show 6-month recurrence schedule instructions")

    args = parser.parse_args()

    if args.schedule_info:
        display_schedule_instructions()
        return

    if args.validate:
        from scripts.validate_curriculum_extraction import validate_extraction
        validate_extraction()
        return

    if args.sample:
        logger.info("Running quick sample pipeline (1 chapter per subject for Classes 9 & 10)...")
        run_pipeline(
            target_classes={"9", "10"},
            target_subjects={"Science", "Mathematics"},
            max_chapters_per_book=1,
            use_selenium=args.selenium,
        )
        return

    if args.run_now:
        classes_arg = [c.lower() for c in args.classes]
        if "all" in classes_arg:
            target_classes = {str(i) for i in range(1, 13)}
        else:
            target_classes = set(args.classes)

        run_pipeline(
            target_classes=target_classes,
            target_subjects=set(args.subjects) if args.subjects else None,
            max_chapters_per_book=args.max_chapters_per_book,
            use_selenium=args.selenium,
        )
        return

    parser.print_help()


if __name__ == "__main__":
    main()
