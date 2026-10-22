export async function GET() {
 const publisher=process.env.ADSENSE_PUBLISHER_ID;
 if (!publisher || !/^pub-\d{16}$/.test(publisher)) return new Response('Advertising is not configured.\n',{status:404,headers:{'Content-Type':'text/plain'}});
 return new Response(`google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`,{headers:{'Content-Type':'text/plain','Cache-Control':'public, max-age=3600'}});
}
