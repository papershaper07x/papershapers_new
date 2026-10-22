import {getDb} from '../../../../db';
import {coordinates,nearbyCells,coarseLocation} from '../../../../lib/marketplace-location';
import {indiaRegions} from '../../../../lib/india-regions';
import {noticeCategories} from '../../../../lib/marketplace';
export async function GET(request:Request) {
  const params=new URL(request.url).searchParams;
  const area=(params.get('area') ?? '').trim().slice(0,100).toLowerCase();
  const q=(params.get('q') ?? '').trim().slice(0,100).toLowerCase();
  const category=params.get('category') ?? '';
  if(category && !noticeCategories.includes(category as typeof noticeCategories[number]))return Response.json({error:'Unknown category.'},{status:400});
  const state=params.get('state') ?? '',city=(params.get('city') ?? '').trim();
  if((state&&!Object.hasOwn(indiaRegions,state))||city.length>80||(city&&!state)||/[\u0000-\u001f<>]/.test(city))return Response.json({error:'Choose a valid state and city.'},{status:400});
  if(city&&Object.entries(indiaRegions).some(([region,cities])=>region!==state&&cities.includes(city)))return Response.json({error:'City does not match the selected state.'},{status:400});
  let point:ReturnType<typeof coarseLocation>|undefined,cells:string[]|undefined;
  let radius=5;
  if(params.has('lat') || params.has('lng')) {
    try {
      if(!params.get('lat') || !params.get('lng'))throw new Error('Both coordinates are required.');
      point=coarseLocation(coordinates(Number(params.get('lat')),Number(params.get('lng'))));
      radius=Number(params.get('radius') ?? 5);cells=nearbyCells(point,radius);
    }catch(error){return Response.json({error:error instanceof Error?error.message:'Invalid location.'},{status:400});}
  }
  const filters=["n.status='approved'",'n.expires_at > CURRENT_TIMESTAMP','NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id)'];
  const values:unknown[]=point?[point.latitude,point.latitude,point.longitude]:[];
  if(area){filters.push('POSITION(? IN LOWER(area)) > 0');values.push(area);}
  if(q){filters.push("POSITION(? IN LOWER(title || ' ' || description || ' ' || place)) > 0");values.push(q);}
  if(state){filters.push(city?'(n.state=? OR n.state IS NULL)':'n.state=?');values.push(state);}
  if(city){filters.push('(n.city=? OR (n.city IS NULL AND POSITION(? IN LOWER(n.area))>0))');values.push(city,city.toLowerCase());}
  if(category){filters.push('(n.category=? OR ?=ANY(n.categories))');values.push(category,category);}
  if(cells){filters.push(`h3_cell IN (${cells.map(()=>'?').join(',')})`);values.push(...cells);}
  const distance=point?'6371.0088 * ACOS(LEAST(1.0,GREATEST(-1.0,SIN(RADIANS(?))*SIN(RADIANS(location_lat))+COS(RADIANS(?))*COS(RADIANS(location_lat))*COS(RADIANS(location_lng - ?)))))':'NULL::DOUBLE PRECISION';
  if(point)values.push(radius);
  try {
    // Filter/order narrow IDs in PostgreSQL, then load at most 51 notice bodies.
    const sql=`WITH matched AS (
      SELECT n.id,n.created_at,${distance} AS distance_km FROM marketplace_notices n WHERE ${filters.join(' AND ')}
    ), page AS (
      SELECT id,created_at,distance_km FROM matched ${point?'WHERE distance_km <= ?':''}
      ORDER BY ${point?'distance_km ASC,':''} created_at DESC,id LIMIT 51
    ) SELECT n.id,title,description,place,area,category,expires_at,n.state,n.city,n.categories,n.reservations_enabled,(SELECT COUNT(*)::int FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.interested) AS interested_count,(SELECT COUNT(*)::int FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.viewed) AS view_count,(SELECT COUNT(*)::int FROM marketplace_reservations r WHERE r.notice_id=n.id AND r.status IN ('requested','confirmed')) AS request_count,p.distance_km,
      EXISTS(SELECT 1 FROM marketplace_media m WHERE m.notice_id=n.id) AS has_image
      FROM page p JOIN marketplace_notices n ON n.id=p.id
      ORDER BY ${point?'p.distance_km ASC,':''} p.created_at DESC,p.id`;
    const {results}=await getDb().prepare(sql).bind(...values).all();
    return Response.json({items:results.slice(0,50),truncated:results.length>50,approximate:Boolean(point),candidateLimitReached:false},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'The local board is unavailable. Please try again later.'},{status:503});}
}
