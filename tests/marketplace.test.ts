import assert from 'node:assert/strict';
import test from 'node:test';
import {validateNotice} from '../lib/marketplace';
const now = Date.parse('2026-10-13T00:00:00Z');
const notice = {title:'Book swap nearby',description:'Bring a book to the public library swap.',place:'Local library',area:'Ulsoor, Bengaluru',category:'Community',expiresAt:'2026-10-20'};
test('valid notices have canonical expiry and trimmed text',()=>{assert.equal(validateNotice({...notice,title:'  Book swap nearby  '},now).title,notice.title);assert.equal(validateNotice(notice,now).expiresAt,'2026-10-20T00:00:00.000Z');});
test('reject attachments, forged moderation status, invalid types, categories and expiry',()=>{for(const value of [null,[],{...notice,image:'x'},{...notice,status:'approved'},{...notice,title:123},{...notice,category:'Gambling'},{...notice,expiresAt:'2026-10-12'},{...notice,expiresAt:'2027-01-01'},{...notice,expiresAt:'bad'},{...notice,description:'short'}]) assert.throws(()=>validateNotice(value,now));});

import {readBoundedText,BodyTooLargeError,rejectCrossOrigin} from '../lib/request-safety';
import {safeAuthDestination} from '../lib/auth-redirects';
import {POST as submitNotice} from '../app/api/marketplace/notices/route';
import {POST as submitReport} from '../app/api/marketplace/reports/route';
test('same-origin protection rejects sibling and missing origins',()=>{for(const origin of [null,'https://evil.example','https://study.papershapers.in']){const headers:Record<string,string> = {};if(origin)headers.origin=origin;assert.equal(rejectCrossOrigin(new Request('https://marketplace.papershapers.in/api',{headers}))?.status,403);}assert.equal(rejectCrossOrigin(new Request('https://marketplace.papershapers.in/api',{headers:{origin:'https://marketplace.papershapers.in'}})),null);});
test('bounded reader rejects oversize bytes including multibyte content',async()=>{assert.equal(await readBoundedText(new Request('https://example.com',{method:'POST',body:'small'}),5),'small');await assert.rejects(()=>readBoundedText(new Request('https://example.com',{method:'POST',body:'₹₹'}),5),BodyTooLargeError);});
test('anonymous submissions and reports cannot reach persistence',async()=>{for(const route of [submitNotice,submitReport]){const request=new Request('https://example.com/api',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{}'});assert.equal((await route(request)).status,401);}});
test('login returns to notice flows without open redirects',()=>{assert.equal(safeAuthDestination('/noticeboard/post'),'/noticeboard/post');assert.equal(safeAuthDestination('/noticeboard/report?id=abc-123'),'/noticeboard/report?id=abc-123');assert.equal(safeAuthDestination('/noticeboard/notices/abc-123'),'/noticeboard/notices/abc-123');assert.equal(safeAuthDestination('/noticeboard/notices/abc?next=https://evil.example'),'/papershapers/dashboard');assert.equal(safeAuthDestination('//evil.example'),'/papershapers/dashboard');assert.equal(safeAuthDestination('/noticeboard/report?id=abc&next=https://evil.example'),'/papershapers/dashboard');});

import {indiaRegions,validateRegion} from '../lib/india-regions';
test('India discovery presets preserve state-city relationships and custom towns',()=>{assert.equal(Object.keys(indiaRegions).length,36);assert.deepEqual(validateRegion('Karnataka','Bengaluru'),{state:'Karnataka',city:'Bengaluru'});assert.equal(validateRegion('Karnataka','A local town').city,'A local town');for(const pair of [['Karnataka','Mumbai'],['invalid','Bengaluru'],['Delhi',null],['Delhi','<private>']])assert.throws(()=>validateRegion(pair[0],pair[1]));assert.deepEqual(validateRegion(undefined,undefined),{state:null,city:null});});

import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {NoticeForm} from '../app/noticeboard/post/notice-form';
test('posting presents exactly one reservation opt-in and structured location fields',()=>{const html=renderToStaticMarkup(createElement(NoticeForm));assert.equal((html.match(/name="reservationsEnabled"/g)||[]).length,1);assert.ok(html.includes('name="state"'));assert.ok(html.includes('name="city"'));});
