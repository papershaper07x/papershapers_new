"""Recover labels from explicit textbook chapter headings, never from body guesses."""
import re


def chapter_label(original: str, text: str, book_title: str = "", chapter_no: int | None = None) -> str:
    number = re.match(r"Chapter\s+(\d+)\s*:", original, re.I)
    expected = chapter_no or (int(number.group(1)) if number else None)
    if expected is None:
        return original
    # Restrict recovery to a numbered CHAPTER heading near the start of a PDF.
    # Only these installed book families have a reviewed heading-before-number
    # layout. Other books can put quotations, captions or body text here.
    heading_text = text[:5000] if book_title.casefold() in {"science", "curiosity"} else ""
    for marker in re.finditer(r"(?m)^\s*(\d+)\s*\n\s*CHAPTER\s*$", heading_text, re.I):
        if int(marker.group(1)) != expected:
            continue
        title_lines = []
        for line in reversed(text[:marker.start()].splitlines()):
            line = line.strip()
            if not line:
                break
            if (line.isdigit() or line.casefold() == book_title.casefold()
                    or re.match(r"^(?:Figure|Activity|CHAPTER)\b", line, re.I)
                    or re.match(r"^(?:\d+[.)]|[a-z]\))", line)
                    or "_" in line or len(line) > 70 or line.endswith((".", ":", ";"))
                    or not (line[0].isupper() or re.match(r"^(?:and|of|the|in|to|for|with)\b", line))):
                break
            if title_lines and title_lines[0] == line:
                continue
            title_lines.insert(0, line)
            if len(title_lines) == 4:
                break
        title = " ".join(title_lines)
        if title and title[0].isupper() and len(title) <= 140 and len(title.split()) <= 18:
            return f"Chapter {expected}: {title}"
    # Old extraction joined two lines with an em dash; remove only a known
    # trailing marker. Other uncertain text stays explicitly marked for review.
    cleaned = re.sub(r"\s*—\s*CHAPTER\s*$", "", original, flags=re.I)
    if re.search(r"—\s*(?:Figure|Activity)\b", cleaned, re.I) or re.fullmatch(r"Chapter\s+\d+:\s*Chapter", cleaned, re.I):
        return f"Chapter {expected} (title pending review)"
    return cleaned


def chapter_sort_key(value: str):
    return tuple((0, int(part)) if part.isdigit() else (1, part.casefold()) for part in re.split(r"(\d+)", value))
