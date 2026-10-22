// Disposable local integration test. No dotenv loading and no remote database access.
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {randomFillSync} from 'node:crypto';

const db=await PGlite.create();
for(const name of (await readdir('database/migrations')).filter(name=>name.endsWith('.sql')).sort())await db.exec(await readFile(`database/migrations/${name}`,'utf8'));
const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port:55439,maxConnections:10});
await socket.start();
const databaseUrl='postgresql://postgres:postgres@127.0.0.1:55439/postgres';
let catalogCalls=0;
const backend=createServer(async(request,response)=>{
 if(request.url==='/v1/study/catalog'){
  catalogCalls++;
  response.setHeader('Content-Type','application/json');
  if(catalogCalls===1){response.writeHead(503);response.end('{}');return;}
  response.end(JSON.stringify({source:'isolated test fixture',classes:[{grade:'10',class_label:'Class 10',subjects:[]}]}));return;
 }
 if(request.url!=='/v1/marketplace/review'){response.writeHead(404);response.end('{}');return;}
 let raw='';for await(const chunk of request)raw+=chunk;
 const value=JSON.parse(raw);
 response.setHeader('Content-Type','application/json');
 if(value.title.includes('Outage')){response.writeHead(503);response.end('{}');return;}
 const decision=value.title.includes('Reject')?'reject':value.title.includes('Pending')?'review':'approve';
 response.end(JSON.stringify({decision,confidence:.99,flags:decision==='approve'?[]:['uncertain'],provider:value.title.includes('Mock')?'mock':'gemini',policy_version:'marketplace-2026-10-13-v1',categories:['Community','Events']}));
});
await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
const port=backend.address().port;
const nextPort=Number(process.env.E2E_PORT || 3200);
const base=`http://localhost:${nextPort}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(nextPort)],{
 env:{...process.env,DATABASE_URL:databaseUrl,BACKEND_ORIGIN:`http://127.0.0.1:${port}`,BACKEND_SHARED_SECRET:'local-e2e-only',REQUEST_LIMITS_ENABLED:'true',MARKETPLACE_AI_REVIEW_ENABLED:'true',MARKETPLACE_IMAGE_STORAGE_BYTES:'100000',BILLING_ENABLED:'false',DATABASE_POOL_MAX:'1'},stdio:['ignore','pipe','pipe']
});
let startup='';child.stdout.on('data',chunk=>{startup+=chunk;});child.stderr.on('data',chunk=>{startup+=chunk;});
const steps=[];
function passed(name){steps.push(name);console.log(`PASS ${name}`);}
async function request(path,method='GET',body,cookie,origin=base){return fetch(`${base}${path}`,{method,headers:{...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
async function runScript(script,extra={}){const childProcess=spawn(process.execPath,[script],{env:{...process.env,...extra},stdio:'pipe'});let output='';childProcess.stdout.on('data',chunk=>output+=chunk);childProcess.stderr.on('data',chunk=>output+=chunk);const code=await new Promise(resolve=>childProcess.once('exit',resolve));return {code,output};}
async function account(name){const response=await request('/api/auth/signup','POST',{name,email:`${name.toLowerCase()}@example.test`,password:'Disposable-test-password-42'});assert.equal(response.status,201);return response.headers.get('set-cookie').split(';')[0];}
const fixture={title:'Dummy test book swap',description:'Dummy local test fixture, not a real event. Bring one book to the test public library.',place:'Test public library',area:'Test area, Bengaluru',category:'Community',expiresAt:new Date(Date.now()+86400000).toISOString(),latitude:12.9716,longitude:77.5946,policyAccepted:true,state:'Karnataka',city:'Bengaluru'};
async function post(cookie,title,imageBase64,reservationsEnabled=false){const response=await request('/api/marketplace/notices','POST',{...fixture,title,reservationsEnabled,...(imageBase64?{imageBase64}:{})},cookie);assert.equal(response.status,201,await response.clone().text());return response.json();}
try{
 for(let i=0;i<60;i++){if(child.exitCode!==null)throw new Error(`Server exited: ${startup.slice(-2000)}`);try{if((await request('/noticeboard')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,500));if(i===59)throw new Error('Server did not start');}
 const migrated=await runScript('scripts/migrate-postgres.mjs',{DATABASE_URL:'postgresql://invalid:invalid@127.0.0.1:1/unused',MIGRATION_DATABASE_URL:databaseUrl});assert.equal(migrated.code,0,migrated.output);passed('migration runner uses separate owner URL and commits isolated schema');
 const preflightEnv={VERCEL:'1',VERCEL_ENV:'preview',PREVIEW_DATABASE_ISOLATED:'true',DATABASE_URL:databaseUrl,MIGRATION_DATABASE_URL:'',BACKEND_ORIGIN:'https://backend.example.test',BACKEND_SHARED_SECRET:'synthetic-service-secret-12345678901234567890',REQUEST_LIMITS_ENABLED:'true',MARKETPLACE_ENABLED:'true',BILLING_ENABLED:'false',NEXT_PUBLIC_HOME_ORIGIN:'https://papershapers.in',NEXT_PUBLIC_STUDY_ORIGIN:'https://study.papershapers.in/papershapers',NEXT_PUBLIC_MARKET_ORIGIN:'https://marketplace.papershapers.in/noticeboard'};
 const verified=await runScript('scripts/prepare-hosted-build.mjs',preflightEnv);assert.equal(verified.code,0,verified.output);assert.ok(verified.output.includes('read only'));
 const unsafe=await runScript('scripts/prepare-hosted-build.mjs',{...preflightEnv,MIGRATION_DATABASE_URL:'postgresql://owner:do-not-log-this@example.test/db'});assert.notEqual(unsafe.code,0);assert.ok(!unsafe.output.includes('do-not-log-this'));passed('Vercel preflight reads existing schema and rejects owner credentials');
 const safeHeaders=await request('/noticeboard');assert.equal(safeHeaders.headers.get('x-frame-options'),'DENY');assert.equal(safeHeaders.headers.get('x-content-type-options'),'nosniff');
 const privateHeaders=await request('/auth');assert.ok(privateHeaders.headers.get('cache-control').includes('no-store'));assert.ok(privateHeaders.headers.get('x-robots-tag').includes('noindex'));passed('browser security headers and private no-store/noindex responses');
 assert.equal((await request('/api/marketplace/listings')).status,200);passed('anonymous browsing with migrated database');
 const preview=await(await request('/noticeboard')).text();assert.ok(preview.includes('Dummy preview'));assert.ok(preview.includes('State or union territory'));assert.ok(preview.includes('All categories'));
 assert.ok(preview.includes('Paper Shapers home'));assert.ok(!preview.includes('portal-switch'));passed('empty catalogue shows labelled non-bookable demo and portal navigation');
 assert.equal((await request('/api/marketplace/notices','POST',fixture)).status,401);passed('anonymous posting blocked');
 const owner=await account('Owner'),other=await account('Other');passed('account creation and shared session cookies');
 assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM community_posts WHERE is_internal=1")).rows[0].n,0);
 passed('account and session access perform no editorial seed writes');
 const journalPage=await request('/papershapers/journal','GET',undefined,owner);assert.equal(journalPage.status,200);
 assert.ok((await journalPage.text()).includes('A calm way to use a practice paper'));
 assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM community_posts WHERE is_internal=1")).rows[0].n,3);
 passed('Journal reads still initialise the editorial guides');
 const failedCatalog=await request('/api/study/catalog');assert.equal(failedCatalog.status,503);assert.match(failedCatalog.headers.get('cache-control'),/no-store/);
 const catalogResponse=await request('/api/study/catalog');assert.equal(catalogResponse.status,200);assert.match(catalogResponse.headers.get('cache-control'),/no-store/);
 assert.equal((await request('/api/study/catalog')).status,200);assert.equal(catalogCalls,2);
 passed('public catalogue retries failures and caches successful backend data without caching API responses');
 const journal={title:'Dummy study revision note',summary:'Dummy test summary describing a useful revision routine.',body:'Dummy test material. This is not a real student publication. Review a short practice paper, then choose one topic to revisit with your teacher before another attempt.'};
 assert.equal((await request('/api/community/posts','POST',journal)).status,401);assert.equal((await request('/api/community/posts','POST',journal,owner,'https://evil.example')).status,403);
 assert.equal((await request('/api/community/posts','POST',{...journal,body:'x'.repeat(17000)},owner)).status,413);
 assert.equal((await request('/api/community/posts','POST',{...journal,status:'published'},owner)).status,400);
 for(let i=0;i<5;i++)assert.equal((await request('/api/community/posts','POST',journal,owner)).status,201);
 assert.equal((await request('/api/community/posts','POST',journal,owner)).status,429);assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM community_posts WHERE title=$1 AND status='pending'",[journal.title])).rows[0].n,5);passed('Journal origin, payload, publication-state and persistent daily admission controls');
 const ownerRow=(await db.query("SELECT id FROM users WHERE email='owner@example.test'")).rows[0];
 await db.query("INSERT INTO auth_identities (id,user_id,provider,provider_subject,email,created_at) VALUES ('dummy-google-identity',$1,'google','dummy-verified-subject','owner@example.test',CURRENT_TIMESTAMP::TEXT)",[ownerRow.id]);
 const unverified=await post(other,'Dummy unverified poster');assert.equal(unverified.status,'pending');passed('unverified email accounts cannot auto-publish');
 assert.equal((await request('/api/marketplace/notices','POST',fixture,owner,'https://evil.example')).status,403);passed('foreign-origin mutations blocked');
 for(const path of ['/api/study/generate','/api/study/requests','/api/study/contact'])assert.equal((await request(path,'POST',{},owner,'https://evil.example')).status,403);
 passed('Study browser mutations reject foreign origins');
 assert.equal((await request('/api/marketplace/notices','POST',{...fixture,policyAccepted:false},owner)).status,400);passed('posting policy acknowledgement required');
 assert.equal((await request('/api/marketplace/notices','POST',{...fixture,status:'approved'},owner)).status,400);
 assert.equal((await request('/api/marketplace/notices','POST',{...fixture,latitude:90},owner)).status,400);passed('forged status and invalid venue coordinates rejected');
 const approved=await post(owner,fixture.title);assert.equal(approved.status,'approved');passed('safe AI verdict publishes and records audit');
 const classified=(await db.query('SELECT state,city,categories FROM marketplace_notices WHERE id=$1',[approved.id])).rows[0];assert.equal(classified.city,'Bengaluru');assert.deepEqual(classified.categories,['Community','Events']);
 const categoryListing=await(await request('/api/marketplace/listings?state=Karnataka&city=Bengaluru&category=Events')).json();assert.ok(categoryListing.items.some(item=>item.id===approved.id));
 assert.equal((await request('/api/marketplace/listings?state=Karnataka&city=Mumbai')).status,400);
 assert.equal((await request('/api/marketplace/notices','POST',{...fixture,city:'Mumbai'},owner)).status,400);passed('structured region validation and multiple AI category discovery');
 const engagementPath=`/api/marketplace/notices/${approved.id}/engagement`;
 assert.equal((await request(engagementPath,'POST',{action:'reserve',reservationConsent:true})).status,401);
 assert.equal((await request(engagementPath,'POST',{action:'interest'},other,'https://evil.example')).status,403);
 assert.equal((await request(engagementPath,'POST',{action:'interest',userId:ownerRow.id},other)).status,400);
 assert.equal((await request(engagementPath,'POST',{action:'reserve',reservationConsent:true},other)).status,409);
 assert.equal((await request(engagementPath,'POST',{action:'interest'},owner)).status,403);
 passed('engagement auth, origin, forged identity, organiser opt-in and self-count guards');
 for(let i=0;i<2;i++) {
  assert.equal((await request(engagementPath,'POST',{action:'view'},other)).status,200);
  assert.equal((await request(engagementPath,'POST',{action:'interest'},other)).status,200);
 }
 let counts=(await (await request(engagementPath,'POST',{action:'view'},other)).json()).engagement;
 assert.equal(counts.views,1);assert.equal(counts.interested,1);assert.equal(counts.requests,0);
 assert.equal((await request(engagementPath,'POST',{action:'uninterest'},other)).status,200);
 counts=(await (await request(engagementPath,'POST',{action:'view'},other)).json()).engagement;assert.equal(counts.interested,0);
 passed('account-deduplicated detail views and reversible interest');
 await db.query('UPDATE marketplace_notices SET reservations_enabled=TRUE WHERE id=$1',[approved.id]);
 assert.equal((await request(engagementPath,'POST',{action:'reserve'},other)).status,400);
 const duplicateReservations=await Promise.all([request(engagementPath,'POST',{action:'reserve',reservationConsent:true},other),request(engagementPath,'POST',{action:'reserve',reservationConsent:true},other)]);
 for(const response of duplicateReservations)assert.equal(response.status,200,await response.clone().text());
 assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM marketplace_reservations')).rows[0].n,1);
 counts=(await (await request(engagementPath,'POST',{action:'view'},other)).json()).engagement;assert.equal(counts.mineStatus,'requested');assert.equal(counts.requests,1);assert.equal(counts.confirmed,0);
 passed('adult/name-sharing consent and concurrent duplicate reservation requests');
 const attendee=(await db.query("SELECT id FROM users WHERE email='other@example.test'")).rows[0];
 assert.equal((await request(engagementPath,'POST',{action:'confirm',userId:attendee.id},other)).status,403);
 assert.equal((await request(engagementPath,'POST',{action:'confirm',userId:attendee.id},owner)).status,200);
 assert.equal((await request(engagementPath,'POST',{action:'decline',userId:attendee.id},owner)).status,409);
 counts=(await (await request(engagementPath,'POST',{action:'view'},other)).json()).engagement;assert.equal(counts.confirmed,1);assert.equal(counts.mineStatus,'confirmed');
 const consumerDesk=await(await request('/noticeboard/dashboard','GET',undefined,other)).text();assert.ok(consumerDesk.includes('confirmed'));assert.ok(consumerDesk.includes('Your reservation updates'));
 const hostDesk=await(await request('/noticeboard/dashboard','GET',undefined,owner)).text();assert.ok(hostDesk.includes('Organiser request inbox'));assert.ok(hostDesk.includes('Other'));
 const publicActivity=await(await request(`/noticeboard/notices/${approved.id}`)).text();assert.ok(publicActivity.includes('Interested accounts'));assert.ok(!publicActivity.includes('other@example.test'));
 passed('owner-only confirmation, private inbox and durable consumer status notification');
 assert.equal((await request(engagementPath,'POST',{action:'cancel'},owner)).status,200);
 counts=(await (await request(engagementPath,'POST',{action:'view'},other)).json()).engagement;assert.equal(counts.mineStatus,'confirmed');
 assert.equal((await request(engagementPath,'POST',{action:'cancel'},other)).status,200);
 counts=(await (await request(engagementPath,'POST',{action:'view'},other)).json()).engagement;assert.equal(counts.requests,0);assert.equal(counts.confirmed,0);
 assert.equal((await request(engagementPath,'POST',{action:'reserve',reservationConsent:true},other)).status,409);
 passed('only attendee cancellation changes counts; closed requests cannot be spam-reopened');
 const declinedUser=await account('Declined');const declinedRow=(await db.query("SELECT id FROM users WHERE email='declined@example.test'")).rows[0];
 assert.equal((await request(engagementPath,'POST',{action:'reserve',reservationConsent:true},declinedUser)).status,200);
 assert.equal((await request(engagementPath,'POST',{action:'decline',userId:declinedRow.id},owner)).status,200);
 assert.ok((await(await request('/noticeboard/dashboard','GET',undefined,declinedUser)).text()).includes('declined'));
 assert.equal((await request(engagementPath,'POST',{action:'confirm',userId:declinedRow.id},owner)).status,409);
 const closedUser=await account('Closed');const closedRow=(await db.query("SELECT id FROM users WHERE email='closed@example.test'")).rows[0];
 assert.equal((await request(engagementPath,'POST',{action:'reserve',reservationConsent:true},closedUser)).status,200);
 assert.equal((await request(engagementPath,'POST',{action:'confirm',userId:closedRow.id},owner)).status,200);
 passed('decline notification and rejection of decisions on already closed requests');
 const image=await sharp({create:{width:1400,height:900,channels:3,background:'#ddd9bd'}}).png().toBuffer();
 const pending=await post(owner,'Dummy Pending poster',image.toString('base64'),true);assert.equal(pending.status,'pending');assert.equal((await db.query('SELECT reservations_enabled FROM marketplace_notices WHERE id=$1',[pending.id])).rows[0].reservations_enabled,true);
 assert.equal((await request(`/api/marketplace/notices/${pending.id}/engagement`,'POST',{action:'view'},other)).status,410);
 assert.equal((await request(`/api/marketplace/media/${pending.id}`)).status,404);passed('pending image bytes stay private');
 const rejected=await post(owner,'Dummy Reject poster');assert.equal(rejected.status,'rejected');
 const outage=await post(owner,'Dummy Outage poster');assert.equal(outage.status,'pending');
 const mocked=await post(owner,'Dummy Mock poster');assert.equal(mocked.status,'pending');passed('rejection, provider outage and mock cannot publish');
 assert.equal((await request('/api/marketplace/notices','POST',fixture,owner)).status,429);passed('persistent daily posting limit');
 const listing=await(await request('/api/marketplace/listings?lat=12.9716&lng=77.5946&radius=5')).json();assert.equal(listing.items.length,1);assert.equal(listing.items[0].id,approved.id);assert.ok(listing.items[0].distance_km<=5);assert.equal('author_id' in listing.items[0],false);passed('H3 search only exposes approved nearby notices');
 assert.equal((await request('/api/marketplace/listings?lat=NaN&lng=77')).status,400);passed('invalid location rejected');
 assert.equal((await request(`/api/marketplace/notices/${approved.id}`,'DELETE',undefined,other)).status,404);passed('another account cannot withdraw owner content');
 assert.equal((await request('/api/saved-items','POST',{portal:'marketplace',itemKey:approved.id,title:fixture.title,metadata:{area:fixture.area}},owner)).status,201);
 assert.equal((await request('/api/preferences','POST',{portal:'marketplace',area:'Test area',values:['Community']},owner)).status,200);
 assert.equal((await request('/api/preferences','POST',{portal:'marketplace',area:{private:'invalid'},values:[]},owner)).status,400);
 assert.equal((await request('/api/saved-items','POST',{portal:'marketplace',itemKey:'invalid-metadata',title:'Dummy bad metadata',metadata:{area:{private:'invalid'}}},owner)).status,400);
 passed('malformed preferences and saved metadata cannot corrupt dashboards');
 const dashboardResponse=await request('/noticeboard/dashboard','GET',undefined,owner);const dashboard=await dashboardResponse.text();assert.ok(dashboard.includes(fixture.title),'Dashboard status '+dashboardResponse.status+'; server diagnostics: '+startup.slice(-3000));passed('saved items, preferences and own submission dashboard');
 for(let i=0;i<2;i++)assert.equal((await request('/api/marketplace/reports','POST',{id:approved.id,reason:'Dummy test report for review.'},other)).status,201);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM marketplace_reports')).rows[0].n,1);passed('reporting is owner-safe and idempotent');
 const moderation=spawn(process.execPath,['scripts/moderate-marketplace.mjs','approve',pending.id,'test-operator','Dummy test verified safe poster','--image-reviewed'],{env:{...process.env,DATABASE_URL:databaseUrl},stdio:'pipe'});
 let moderationError='';moderation.stderr.on('data',chunk=>moderationError+=chunk);
 const exit=await new Promise(resolve=>moderation.on('exit',resolve));assert.equal(exit,0,moderationError);
 const media=await request(`/api/marketplace/media/${pending.id}`);assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/webp');const bytes=Buffer.from(await media.arrayBuffer());assert.ok(bytes.length<=250000);const metadata=await sharp(bytes).metadata();assert.equal(metadata.exif,undefined);passed('operator approval publishes compressed image with no EXIF');
 const noticePage=await(await request(`/noticeboard/notices/${approved.id}`)).text();assert.ok(noticePage.includes(fixture.title));passed('public notice detail renders server-side');
 const discoveryMap=await(await request('/sitemap.xml')).text();assert.ok(discoveryMap.includes(`/noticeboard/notices/${approved.id}`));assert.ok(!discoveryMap.includes('dummy-study-revision-note'));assert.ok(!discoveryMap.includes(`/noticeboard/notices/${unverified.id}`));passed('sitemap discovers only public approved content');
 await db.exec(`UPDATE marketplace_notices SET expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id='${pending.id}'`);
 assert.equal((await request(`/api/marketplace/media/${pending.id}`)).status,404);assert.equal((await request(`/noticeboard/notices/${pending.id}`)).status,404);passed('expired notices and images stop being public');
 assert.equal((await request(`/api/marketplace/notices/${approved.id}`,'DELETE',undefined,owner)).status,200);assert.equal((await(await request('/api/marketplace/listings')).json()).items.length,0);passed('owner withdrawal removes public listing');assert.ok(!(await(await request('/sitemap.xml')).text()).includes(`/noticeboard/notices/${approved.id}`));
 assert.equal((await request(engagementPath,'POST',{action:'interest'},other)).status,410);
 assert.equal((await request(engagementPath,'POST',{action:'cancel'},other)).status,200);passed('withdrawn notice refuses engagement but allows cancellation');
 assert.ok((await(await request('/noticeboard/dashboard','GET',undefined,closedUser)).text()).includes('do not rely on a previous confirmation'));
 assert.equal((await request(engagementPath,'POST',{action:'confirm',userId:closedRow.id},owner)).status,410);
 assert.equal((await request(engagementPath,'POST',{action:'cancel'},closedUser)).status,200);passed('notice closure overrides previous confirmation and still permits attendee cancellation');
 const otherRow=(await db.query("SELECT id FROM users WHERE email='other@example.test'")).rows[0];
 const noisy=await sharp(randomFillSync(Buffer.alloc(900*900*3)),{raw:{width:900,height:900,channels:3}}).webp({quality:80}).toBuffer();
 assert.equal((await request('/api/marketplace/notices','POST',{...fixture,title:'Dummy image capacity test',imageBase64:noisy.toString('base64')},other)).status,507);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM marketplace_notices WHERE title='Dummy image capacity test'")).rows[0].n,0);passed('full image budget rolls back submission');
 await db.query("INSERT INTO marketplace_poster_blocks(user_id,reason,operator) VALUES($1,'Dummy test operator block','test-operator')",[otherRow.id]);
 assert.equal((await request('/api/marketplace/notices','POST',fixture,other)).status,403);passed('blocked posters cannot submit');
 const robots=await(await request('/robots.txt')).text();assert.ok(robots.includes('/noticeboard/post'));
 const sitemap=await(await request('/sitemap.xml')).text();assert.ok(sitemap.includes('/noticeboard/guides/posting-a-clear-local-notice'));assert.ok(!sitemap.includes('example-weekend-book-swap'));
 const dummy=await(await request('/noticeboard/guides/example-weekend-book-swap')).text();assert.ok(dummy.includes('noindex'));assert.ok(dummy.includes('Dummy article'));passed('robots, sitemap and dummy noindex disclosure');
 for(const path of ['/','/papershapers','/noticeboard/guides','/noticeboard/safety','/privacy','/terms'])assert.equal((await request(path)).status,200);
 passed('umbrella, Study and legal public routes');
 assert.equal((await request('/api/auth/logout','POST',undefined,owner)).status,204);assert.equal((await request('/api/marketplace/notices','POST',fixture,owner)).status,401);passed('logout invalidates posting session');
 console.log(JSON.stringify({checks:steps.length,passed:true,database:'isolated PGlite PostgreSQL-compatible',ai:'stubbed transport; real backend tested separately'},null,2));
 if(process.argv.includes('--serve')){
   await db.query("UPDATE marketplace_notices SET reservations_enabled=TRUE WHERE id=$1",[pending.id]);
   await db.query("UPDATE marketplace_notices SET status='approved',expires_at=CURRENT_TIMESTAMP + INTERVAL '1 day' WHERE id=$1",[pending.id]);
   console.log(`LOCAL TEST PREVIEW ${base}; isolated dummy fixture only. Ctrl+C to stop.`);
   await new Promise(resolve=>process.on('SIGINT',resolve));
 }
}finally{
 child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));await new Promise(resolve=>backend.close(resolve));await socket.stop();await db.close();
}



