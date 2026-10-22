import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const [action,id,reviewer,...words] = process.argv.slice(2);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required. Use a trusted operator terminal.');
const sql = postgres(process.env.DATABASE_URL,{max:1});
try {
 if (action === 'queue') {
  console.log(JSON.stringify(await sql`SELECT id,title,description,place,area,category,expires_at,status FROM marketplace_notices WHERE status = 'pending' ORDER BY created_at LIMIT 100`,null,2));
  console.log(JSON.stringify(await sql`SELECT r.id,r.notice_id,r.reason,r.created_at,n.title,n.status FROM marketplace_reports r JOIN marketplace_notices n ON n.id=r.notice_id ORDER BY r.created_at DESC LIMIT 100`,null,2));
 } else if(action === 'block' || action === 'unblock') {
  const reason=words.join(' ').trim();
  if(!id || !reviewer || reason.length < 10)throw new Error('Usage: block|unblock USER_ID OPERATOR reason (10+ characters)');
  await sql.begin(async tx=>{
   if(action==='block') {
    await tx`INSERT INTO marketplace_poster_blocks(user_id,reason,operator) VALUES(${id},${reason},${reviewer}) ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason,operator=excluded.operator,created_at=CURRENT_TIMESTAMP`;
    const notices=await tx`UPDATE marketplace_notices SET status='withdrawn' WHERE author_id=${id} AND status IN ('approved','pending') RETURNING id`;
    for(const notice of notices)await tx`INSERT INTO marketplace_reviews(id,notice_id,reviewer,decision,reason) VALUES(${randomUUID()},${notice.id},${reviewer},'withdrawn',${reason})`;
   }else await tx`DELETE FROM marketplace_poster_blocks WHERE user_id=${id}`;
  });
  console.log(`Recorded ${action} for poster ${id}`);
 } else if(action === 'image') {
  if(!id || !/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new Error('Provide a notice ID.');
  const rows=await sql`SELECT image_bytes FROM marketplace_media WHERE notice_id=${id}`;
  if(!rows.length)throw new Error('No image attached.');
  const directory=path.resolve('work','marketplace-quarantine');
  await mkdir(directory,{recursive:true});
  const file=path.join(directory,`${id}.webp`);
  await writeFile(file,rows[0].image_bytes);
  console.log(`Private reviewer image: ${file}. Remove your local copy after review.`);
 } else {
  const reason = words.filter(word=>word!=='--image-reviewed').join(' ').trim();
  if (!['approve','reject','withdraw'].includes(action) || !id || !reviewer || reason.length < 10) throw new Error('Usage: queue OR approve|reject|withdraw ID REVIEWER reason (10+ characters)');
  const status = {approve:'approved',reject:'rejected',withdraw:'withdrawn'}[action];
  await sql.begin(async tx => {
   const media=await tx`SELECT notice_id FROM marketplace_media WHERE notice_id=${id}`;
   if(action==='approve' && media.length && !words.includes('--image-reviewed'))throw new Error('Inspect the private image first, then pass --image-reviewed with your decision.');
   const rows = action === 'withdraw'
    ? await tx`UPDATE marketplace_notices SET status=${status} WHERE id=${id} AND status IN ('approved','pending') RETURNING id`
    : await tx`UPDATE marketplace_notices SET status=${status} WHERE id=${id} AND status='pending' AND expires_at > CURRENT_TIMESTAMP RETURNING id`;
   if (!rows.length) throw new Error('Notice missing, expired, or invalid transition.');
   await tx`INSERT INTO marketplace_reviews(id,notice_id,reviewer,decision,reason) VALUES(${randomUUID()},${id},${reviewer},${status},${reason})`;
  });
  console.log(`Recorded ${status} for ${id}`);
 }
} finally {await sql.end();}
