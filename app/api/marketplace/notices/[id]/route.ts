import {getDb} from '../../../../../db';
import {userFromRequest} from '../../../../../lib/auth';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}) {
 if(request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Invalid origin.'},{status:403});
 try {
 const user = await userFromRequest(request); if(!user) return Response.json({error:'Sign in first.'},{status:401});
 const {id} = await params;
 const row = await getDb().prepare("UPDATE marketplace_notices SET status='withdrawn' WHERE id=? AND author_id=? AND status IN ('pending','approved') RETURNING id").bind(id,user.id).first();
 if(!row) return Response.json({error:'Notice unavailable or already closed.'},{status:404});
 return Response.json({ok:true});
 }catch{return Response.json({error:'Could not withdraw notice.'},{status:503});}
}
