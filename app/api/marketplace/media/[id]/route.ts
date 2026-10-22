import {getDb} from '../../../../../db';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id} = await params;
 try {
  const row = await getDb().prepare("SELECT image_bytes FROM marketplace_media m JOIN marketplace_notices n ON n.id=m.notice_id WHERE n.id=? AND n.status='approved' AND n.expires_at > CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id)").bind(id).first<{image_bytes:Buffer}>();
  if (!row) return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  return new Response(new Uint8Array(row.image_bytes),{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'"}});
 }catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});}
}

