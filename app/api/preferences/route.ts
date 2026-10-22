import {rejectCrossOrigin,readBoundedText,BodyTooLargeError} from '../../../lib/request-safety';
import {updatePreferences} from '../../../db/service';
import {userFromRequest} from '../../../lib/auth';
export async function POST(request:Request) {
 const rejected=rejectCrossOrigin(request);if(rejected)return rejected;
 try{
  const user=await userFromRequest(request);if(!user)return Response.json({error:'Sign in to save preferences.'},{status:401});
  let body;try{body=JSON.parse(await readBoundedText(request,4000));}catch(error){return Response.json({error:'Invalid preference selection.'},{status:error instanceof BodyTooLargeError?413:400});}
  if(!body || body.portal!=='marketplace' || !Array.isArray(body.values) || body.values.length>12 || !body.values.every((value:unknown)=>typeof value==='string'&&value.length<=50) || body.area!==undefined&&(typeof body.area!=='string'||body.area.length>100))return Response.json({error:'Choose a valid area and interests.'},{status:400});
  await updatePreferences(user.id,body.portal,body.values,body.area);return Response.json({ok:true});
 }catch{return Response.json({error:'Could not save preferences. Please try again.'},{status:503});}
}
