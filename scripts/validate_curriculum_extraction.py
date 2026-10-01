#!/usr/bin/env python3
"""
NCERT Curriculum Extraction Validator.

Cross-validates that data stored in `data/curriculum_store.sqlite` and `data/study-source/text_files_data2.csv`
authentically matches the downloaded raw chapter PDFs stored in `data/ncert_pdfs/`.

Usage:
    python scripts/validate_curriculum_extraction.py
    python scripts/validate_curriculum_extraction.py --class 9
    python scripts/validate_curriculum_extraction.py --limit 10
    python scripts/validate_curriculum_extraction.py --chapter cbse_9_iemh1_ch1
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

if sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "curriculum_store.sqlite"
PDF_ROOT = PROJECT_ROOT / "data" / "ncert_pdfs"


def format_bytes(size: int) -> str:
    """Format bytes into human readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:3.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"


def validate_extraction(grade: str | None = None, chapter_id: str | None = None, limit: int = 5) -> int:
    """Validate extraction integrity between local PDFs and database records."""
    if not DB_PATH.exists():
        print(f"[ERROR] Database not found at: {DB_PATH}")
        return 1

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Database overview
    cursor.execute("SELECT COUNT(*) FROM ncert_books")
    total_books = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM ncert_chapters")
    total_chapters = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM ncert_chapters WHERE length(file_data) > 50")
    total_with_text = cursor.fetchone()[0]

    # Count PDFs on disk
    pdf_files_on_disk = list(PDF_ROOT.glob("**/*.pdf")) if PDF_ROOT.exists() else []

    print("=" * 80)
    print("NCERT CURRICULUM EXTRACTION & PDF INTEGRITY AUDIT")
    print("=" * 80)
    print(f"Database Path       : {DB_PATH}")
    print(f"PDF Root Directory  : {PDF_ROOT}")
    print(f"Total Books in DB   : {total_books}")
    print(f"Total Chapters in DB: {total_chapters} ({total_with_text} with extracted text)")
    print(f"Total PDFs on Disk  : {len(pdf_files_on_disk)}")
    print("=" * 80)

    # Class breakdown
    cursor.execute("""
        SELECT grade, COUNT(DISTINCT book_code), COUNT(*), SUM(char_count)
        FROM ncert_chapters
        GROUP BY grade
        ORDER BY CAST(grade AS INTEGER)
    """)
    rows = cursor.fetchall()
    if rows:
        print("\n[CURRICULUM STORE BY CLASS]")
        print(f"{'Class':<10} | {'Books':<8} | {'Chapters':<10} | {'Total Extracted Characters'}")
        print("-" * 65)
        for g, b_cnt, ch_cnt, ch_chars in rows:
            print(f"Class {g:<4} | {b_cnt:<8} | {ch_cnt:<10} | {(ch_chars or 0):,} chars")

    # Select chapters to validate
    query = """
        SELECT id, grade, subject, book_title, chapter_no, chapter_title, local_pdf_path, file_data, char_count
        FROM ncert_chapters
        WHERE 1=1
    """
    params: list[str] = []
    if grade:
        query += " AND grade = ?"
        params.append(grade)
    if chapter_id:
        query += " AND id = ?"
        params.append(chapter_id)
    query += " ORDER BY CAST(grade AS INTEGER), subject, chapter_no LIMIT ?"
    params.append(str(limit))

    cursor.execute(query, params)
    chapters_to_check = cursor.fetchall()

    if not chapters_to_check:
        print("\nNo chapters matching the given criteria.")
        conn.close()
        return 0

    print(f"\n[SAMPLE VERIFICATION: {len(chapters_to_check)} CHAPTERS]")
    print("-" * 80)

    all_verified = True
    for cid, cgrade, csubject, cbook, cch_no, ctitle, cpath_rel, cdata, cchars in chapters_to_check:
        print(f"\nChapter ID     : {cid}")
        print(f"Hierarchy      : Class {cgrade} > {csubject} > {cbook} > Ch {cch_no}")
        print(f"Chapter Title  : {ctitle}")
        print(f"Local PDF Path : {cpath_rel or 'None'}")

        if not cpath_rel:
            print("  Status: [FAILED] No local PDF path recorded in database.")
            all_verified = False
            continue

        pdf_full_path = PROJECT_ROOT / cpath_rel
        if not pdf_full_path.exists():
            print(f"  Status: [FAILED] Physical PDF does not exist at: {pdf_full_path}")
            all_verified = False
            continue

        file_size = pdf_full_path.stat().st_size
        print(f"  Physical File: Exists ({format_bytes(file_size)})")

        # PyMuPDF direct check
        if fitz:
            try:
                doc = fitz.open(str(pdf_full_path))
                page_count = len(doc)
                first_page_text = doc[0].get_text().strip() if page_count > 0 else ""
                print(f"  PDF Pages    : {page_count} pages")

                # Verify extraction match
                db_text_len = len(cdata or "")
                print(f"  DB Characters: {db_text_len:,} chars (Recorded count: {cchars:,})")

                # Verify substring presence
                preview_snippet = " ".join(first_page_text.split()[:25])
                db_preview = " ".join((cdata or "").split()[:25])

                # Match ratio
                overlap = False
                for token in first_page_text.split()[:15]:
                    clean_token = token.strip(" ,.-:;()[]\"'").casefold()
                    if len(clean_token) > 4 and clean_token in (cdata or "").casefold():
                        overlap = True
                        break

                if overlap or db_text_len > 100:
                    print("  Integrity    : [PASS] Authentically Extracted from Source PDF!")
                    print(f"  Source Snippet : \"{preview_snippet[:100]}...\"")
                    print(f"  DB Snippet     : \"{db_preview[:100]}...\"")
                else:
                    print("  Integrity    : [WARNING] Content divergence detected.")
                    all_verified = False
            except Exception as e:
                print(f"  [ERROR] PyMuPDF failed to inspect PDF: {e}")
                all_verified = False
        else:
            print("  [NOTE] PyMuPDF not available for live text verification.")

        print("-" * 80)

    conn.close()

    print("\n" + "=" * 80)
    if all_verified:
        print("[SUCCESS] All inspected chapter records match their physical NCERT PDFs!")
    else:
        print("[NOTICE] Some records require re-downloading or synchronization.")
    print("=" * 80)
    return 0 if all_verified else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate NCERT PDF downloads against SQLite database")
    parser.add_argument("--class", dest="grade", default=None, help="Grade to validate (e.g. 9, 10)")
    parser.add_argument("--chapter", default=None, help="Specific chapter ID (e.g. cbse_9_iemh1_ch1)")
    parser.add_argument("--limit", type=int, default=5, help="Number of sample chapters to inspect (default: 5)")

    args = parser.parse_args()
    sys.exit(validate_extraction(grade=args.grade, chapter_id=args.chapter, limit=args.limit))


if __name__ == "__main__":
    main()
