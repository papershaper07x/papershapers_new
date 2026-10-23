import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {vercelConfigurationErrors,verifyVercelSchema} from '../scripts/vercel-readiness.mjs';

test('deployment exclusions preserve nested portal and API source directories',async()=>{
 const rules=(await readFile(new URL('../.vercelignore',import.meta.url),'utf8')).split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'));
 const directories=rules.filter(line=>line.endsWith('/'));
 assert.ok(directories.length>0);
 assert.ok(directories.every(line=>line.startsWith('/')),'directory exclusions must target the repository root');
 assert.ok(directories.includes('/backend/'));assert.ok(directories.includes('/papershapers/'));
 assert.ok(!directories.includes('/app/'));assert.ok(!directories.includes('/mobile/'));
});

const valid={VERCEL_ENV:'production',MARKETPLACE_ENABLED:'true',DATABASE_URL:'postgresql://runtime:test@localhost:5432/test',BACKEND_ORIGIN:'https://backend.example.test',BACKEND_SHARED_SECRET:'synthetic-service-secret-12345678901234567890',REQUEST_LIMITS_ENABLED:'true',NEXT_PUBLIC_HOME_ORIGIN:'https://papershapers.in',NEXT_PUBLIC_STUDY_ORIGIN:'https://study.papershapers.in/papershapers',NEXT_PUBLIC_MARKET_ORIGIN:'https://marketplace.papershapers.in/noticeboard'};
test('Vercel rejects unsafe configuration without returning secret values',()=>{
 assert.deepEqual(vercelConfigurationErrors(valid),[]);
 for(const change of [{VERCEL_ENV:'preview'},{MIGRATION_DATABASE_URL:'postgresql://owner:private-password@db/test'},{BACKEND_ORIGIN:'http://backend.example.test'},{NEXT_PUBLIC_STUDY_ORIGIN:'https://study.papershapers.in'},{REQUEST_LIMITS_ENABLED:'false'},{NEXT_PUBLIC_DATABASE_URL:'secret-value'}]){
  const errors=vercelConfigurationErrors({...valid,...change});assert.ok(errors.length);assert.ok(!errors.join('').includes('private-password'));assert.ok(!errors.join('').includes('secret-value'));
 }
 assert.deepEqual(vercelConfigurationErrors({...valid,VERCEL_ENV:'preview',PREVIEW_DATABASE_ISOLATED:'true'}),[]);
});
test('schema preflight fails closed before a missing marketplace schema can deploy',async()=>{
 const missing=async()=>[{relation:null}];await assert.rejects(()=>verifyVercelSchema(missing,{MARKETPLACE_ENABLED:'true'}),/Missing users/);
 const queries=[];const existing=async(strings,...values)=>{queries.push([strings.join(''),values]);return strings.join('').includes('version FROM')?[{version:'0013_marketplace_discovery'}]:[{relation:'exists'}];};
 await verifyVercelSchema(existing,{MARKETPLACE_ENABLED:'true'});assert.ok(queries.every(([query])=>!/^\s*(INSERT|UPDATE|DELETE|ALTER|CREATE|GRANT)/i.test(query)));
});
test('preview robots, sitemap and response headers suppress discovery without database reads',async()=>{
 const previous={VERCEL:process.env.VERCEL,VERCEL_ENV:process.env.VERCEL_ENV};
 try{
  process.env.VERCEL='1';process.env.VERCEL_ENV='preview';
  const [{default:robots},{default:sitemap},{default:config}]=await Promise.all([import('../app/robots.ts'),import('../app/sitemap.ts'),import('../next.config.ts')]);
  assert.equal((await robots()).rules.disallow,'/');assert.deepEqual(await sitemap(),[]);
  assert.ok((await config.headers()).some(rule=>rule.source==='/:path*'&&rule.headers.some(header=>header.key==='X-Robots-Tag'&&header.value.includes('noindex'))));
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
