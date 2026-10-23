"""Refresh public class/subject discovery from the installed source, without a scrape."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.curriculum import catalog  # noqa: E402

source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data/study-source/text_files_data2.csv"
data = catalog(source)
paths = []
for entry in data["classes"]:
    base = f"/syllabus/class-{entry['grade']}"
    paths.append(base)
    for subject in entry["subjects"]:
        slug = "-".join(subject["subject"].lower().strip().split())
        from urllib.parse import quote
        paths.append(f"{base}/{quote(slug, safe='')}")
output = ROOT / "app/syllabus/discovery-paths.json"
output.write_text(json.dumps({"source": "Installed curriculum; refresh when class/subject availability changes", "paths": sorted(set(paths))}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(set(paths))} public class/subject paths to {output.relative_to(ROOT)}")
