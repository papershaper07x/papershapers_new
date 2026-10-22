// Disposable PostgreSQL-wire regression: never loads dotenv or remote URLs.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const db = await PGlite.create();
const port = 55448;
const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port, maxConnections: 3 });
let python = process.platform === 'win32' ? 'backend/.venv/Scripts/python.exe' : 'backend/.venv/bin/python';
try { await access(python); } catch { python = 'python'; }
try {
  await db.exec(await readFile('database/migrations/0001_initial.sql', 'utf8'));
  await db.exec("INSERT INTO users(id,name,email,password_hash,password_salt,created_at) VALUES ('quota-a','Synthetic A','a@example.test','unused','unused','2026-10-22'),('quota-b','Synthetic B','b@example.test','unused','unused','2026-10-22')");
  await socket.start();
  const code = `
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from backend.app.database import Database
from backend.app.schemas import StudyPaperRequest
from backend.app.study_quota import reserve_generation, DailyQuotaExceeded
from backend.app.study import _save_paper
from backend.app.study_jobs import run_next, job_status

db=Database(Path('unused'), 'postgresql://postgres:postgres@127.0.0.1:${port}/postgres')
request=StudyPaperRequest(user_id='quota-a',grade='10',subject='Science',chapters=['Electricity'])
router=SimpleNamespace(settings=SimpleNamespace())
ids=[reserve_generation(db,request,queued=True) for _ in range(5)]
try:
 reserve_generation(db,request,queued=True)
 raise AssertionError('sixth request admitted')
except DailyQuotaExceeded: pass
reserve_generation(db,request.model_copy(update={'user_id':'quota-b'}),queued=True)
async def complete(db, router, request, *, job_id):
 return _save_paper(db, request, {'questions':[]}, 'gemini', generation_source='fresh', job_id=job_id)
with patch('backend.app.study_jobs.generate_paper', side_effect=complete):
 assert asyncio.run(run_next(db,router)), 'worker failed to claim a queued paper'
assert job_status(db,ids[0],'quota-a')['status']=='ready'
with patch('backend.app.study_jobs.generate_paper', new=AsyncMock(side_effect=RuntimeError('synthetic failure'))):
 assert asyncio.run(run_next(db,router))
assert job_status(db,ids[1],'quota-a')['status']=='failed'
reserve_generation(db,request,queued=True)
print('PASS PostgreSQL wire: worker wildcard query, durable completion, failure recovery, five-slot cap and account isolation')
`;
  const child = spawn(python, ['-c', code], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  const status = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  if (status !== 0) process.exitCode = 1;
} finally {
  await socket.stop();
  await db.close();
}
