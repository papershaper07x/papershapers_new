"""Operator-only export for educator review; does not mark drafts approved."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.app.config import Settings
from backend.app.database import Database
from backend.app.study import get_paper

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--paper-id', required=True)
parser.add_argument('--user-id', required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
settings = Settings.from_env()
record = get_paper(Database(settings.db_path, settings.database_url), args.paper_id, args.user_id, include_mock=False)
if not record or record['paper'].get('mode') != 'board-mock':
    raise SystemExit('No board mock draft matches that paper and owner.')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({'review_status':'educator-review-pending','checklist':['Current summative syllabus only','All 38 questions answerable','Independent worked solutions and objective keys','Equivalent OR alternatives','Diagram geometry and labels','Step credits and subpart totals','Realistic wording and timing'], 'paper':record['paper']},ensure_ascii=False,indent=2),encoding='utf-8')
print('Private review bundle saved. Educator review is still pending.')
