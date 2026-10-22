import {SITE_ORIGIN} from './site';
export function marketplaceUrl(path:string) {
 const configured=process.env.NEXT_PUBLIC_MARKET_ORIGIN;
 return `${configured ? new URL(configured).origin : SITE_ORIGIN}${path}`;
}
