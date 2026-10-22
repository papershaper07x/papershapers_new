import {rejectCrossOrigin,readBoundedText,BodyTooLargeError} from '../../../lib/request-safety';
import {saveItem} from '../../../db/service';
import {userFromRequest} from '../../../lib/auth';
export async function POST(request:Request) {
 const rejected=rejectCrossOrigin(request);if(rejected)return rejected;
 try{
  const user=await userFromRequest(request);if(!user)return Response.json({error:'Sign in to save this item.'},{status:401});
  let body;try{body=JSON.parse(await readBoundedText(request,4000));}catch(error){return Response.json({error:'Invalid saved item.'},{status:error instanceof BodyTooLargeError?413:400});}
  if(!body || body.portal!=='marketplace' || typeof body.itemKey!=='string' || !body.itemKey || body.itemKey.length>100 || body.itemKey==='__preferences__' || typeof body.title!=='string' || !body.title || body.title.length>180)return Response.json({error:'Invalid saved item.'},{status:400});
  const source=body.metadata ?? {};
  if(!source || typeof source!=='object' || Array.isArray(source) || ['area','category'].some(key=>source[key]!==undefined&&(typeof source[key]!=='string'||source[key].length>100)))return Response.json({error:'Invalid saved item details.'},{status:400});
  const metadata={...(typeof source.area==='string'?{area:source.area}:{}),...(typeof source.category==='string'?{category:source.category}:{})};
  await saveItem(user.id,'marketplace',body.itemKey,body.title,metadata);return Response.json({ok:true},{status:201});
 }catch{return Response.json({error:'Could not save this item. Please try again.'},{status:503});}
}
