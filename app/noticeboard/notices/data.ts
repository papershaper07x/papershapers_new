import {cache} from 'react';
import {getDb} from '../../../db';
export type PublishedNotice={id:string;title:string;description:string;place:string;area:string;category:string;expires_at:string;has_image:boolean;state:string|null;city:string|null;categories:string[]};
export const publishedNotice=cache(async(id:string)=>{
 if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return null;
 return getDb().prepare("SELECT n.id,title,description,place,area,category,expires_at,n.state,n.city,n.categories,EXISTS(SELECT 1 FROM marketplace_media m WHERE m.notice_id=n.id) AS has_image FROM marketplace_notices n WHERE n.id=? AND status='approved' AND expires_at > CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id)").bind(id).first<PublishedNotice>();
});

