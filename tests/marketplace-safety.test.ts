import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {latLngToCell} from 'h3-js';
import {coordinates,coarseLocation,nearbyCells,distanceKm,LOCATION_RESOLUTION} from '../lib/marketplace-location';
import {compressNoticeImage,MAX_IMAGE_BYTES} from '../lib/marketplace-image';
const point={latitude:12.9716,longitude:77.5946};
test('H3 candidate coverage includes radius boundaries and the date line',()=>{
 for(const origin of [point,{latitude:0,longitude:179.999},{latitude:70,longitude:-179.999}]) {
  const cells=new Set(nearbyCells(origin,5));
  assert.ok(cells.has(latLngToCell(origin.latitude,origin.longitude,LOCATION_RESOLUTION)));
  for(let bearing=0;bearing<360;bearing+=30) {
   const rad=bearing*Math.PI/180;
   const latitude=origin.latitude+4.8/111.2*Math.cos(rad);
   const longitude=((origin.longitude+4.8/(111.2*Math.cos(origin.latitude*Math.PI/180))*Math.sin(rad)+540)%360)-180;
   assert.ok(cells.has(latLngToCell(latitude,longitude,LOCATION_RESOLUTION)));
  }
 }
});
test('coordinates and radius reject NaN, incomplete or excessive values',()=>{for(const bad of [[NaN,77],[90,77],[12,181],['12',77],[12,null]])assert.throws(()=>coordinates(...bad as [unknown,unknown]));for(const radius of [0,11,Infinity])assert.throws(()=>nearbyCells(point,radius));});
test('distance is symmetric and coarse location stores a cell centre',()=>{const coarse=coarseLocation(point);assert.equal(distanceKm(point,point),0);assert.ok(distanceKm(point,coarse)<2);assert.equal(distanceKm(point,coarse),distanceKm(coarse,point));assert.notEqual(coarse.latitude,point.latitude);});
test('images are re-encoded, bounded, resized and stripped of EXIF',async()=>{
 const original=await sharp({create:{width:2000,height:1500,channels:3,background:'#eab75d'}}).jpeg().withMetadata().toBuffer();
 const result=await compressNoticeImage(original.toString('base64'));
 assert.ok(result.bytes.length<=MAX_IMAGE_BYTES);assert.ok(result.width<=1200);assert.ok(result.height<=1200);
 const info=await sharp(result.bytes).metadata();assert.equal(info.format,'webp');assert.equal(info.exif,undefined);
});
test('reject arbitrary URLs, SVG, malformed image bytes and excessive pixels',async()=>{
 for(const value of ['https://example.com/photo.png',Buffer.from('<svg/>').toString('base64'),'bad!',123])await assert.rejects(()=>compressNoticeImage(value));
 const huge=await sharp({create:{width:5000,height:4000,channels:3,background:'#fff'}}).png().toBuffer();
 await assert.rejects(()=>compressNoticeImage(huge.toString('base64')));
});

import {ImageProcessingBusyError} from '../lib/marketplace-image';
test('concurrent image work rejects excess admission instead of queuing decoded buffers',async()=>{
 const original=await sharp({create:{width:1200,height:1000,channels:3,background:'#eee'}}).png().toBuffer();
 const first=compressNoticeImage(original.toString('base64'));
 await assert.rejects(()=>compressNoticeImage(original.toString('base64')),ImageProcessingBusyError);
 await first;
 // Slot is released after success and failure.
 await assert.rejects(()=>compressNoticeImage('bad!'));
 assert.ok((await compressNoticeImage(original.toString('base64'))).bytes.length<=MAX_IMAGE_BYTES);
});
