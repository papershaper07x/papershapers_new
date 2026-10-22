"use client";
import {useState} from 'react';
import {RegionPicker} from '../region-picker';
import {noticeCategories} from '../../../lib/marketplace';

async function prepareImage(file:File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8_000_000) throw new Error('Choose a JPEG, PNG or WebP image under 8 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if(bitmap.width*bitmap.height > 16_000_000) throw new Error('Image dimensions are too large.');
    const scale = Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d'); if(!context) throw new Error('Image resizing is unavailable on this browser.');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value ? resolve(value) : reject(new Error('Could not resize image.')),'image/webp',.75));
    if(blob.size > 1_000_000) throw new Error('Image is still too large. Choose a smaller image.');
    return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read image.'));reader.readAsDataURL(blob);});
  }finally{bitmap.close();}
}
export function NoticeForm() {
  const [region,setRegion]=useState({state:'',city:''});
  const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  return <form className="market-compose-form" onSubmit={async event=>{
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');
    try{
      const value:Record<string,unknown>={};
      for(const field of ['title','place','area','category','description','expiresAt']) value[field]=data.get(field);
      value.expiresAt=new Date(String(data.get('expiresAt'))+'T23:59:59+05:30').toISOString();
      value.state=data.get('state');value.city=data.get('city');
      value.area=String(data.get('area')).trim();
      value.policyAccepted=data.get('policyAccepted')==='on';
      value.reservationsEnabled=data.get('reservationsEnabled')==='on';
      const latitude=String(data.get('latitude') ?? '').trim(),longitude=String(data.get('longitude') ?? '').trim();
      if(latitude || longitude){value.latitude=Number(latitude);value.longitude=Number(longitude);if(!latitude || !longitude)throw new Error('Enter both venue coordinates.');}
      const file=data.get('image');if(file instanceof File && file.size)value.imageBase64=await prepareImage(file);
      setMessage('Saving and checking your notice. Please keep this page open…');
      const response=await fetch('/api/marketplace/notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
      const result=await response.json();if(!response.ok)throw new Error(result.error);
      setMessage(result.status==='approved' ? 'Published after automated review. You can withdraw it from your local desk.' : result.status==='rejected' ? 'This notice was not approved. Check the posting policy or contact support for an appeal.' : 'Saved privately for further review. It is not public yet.');
      form.reset();setRegion({state:'',city:''});
    }catch(error){setMessage(error instanceof Error ? error.message : 'Could not submit. Please try again.');}finally{setBusy(false);}
  }}>
    <label>Title<input name="title" required minLength={5} maxLength={100}/></label>
    <label>Organisation or organiser<input name="place" required minLength={2} maxLength={100}/></label>
    <RegionPicker required state={region.state} city={region.city} onChange={(state,city)=>setRegion({state,city})}/><label>Neighbourhood or area<input name="area" required minLength={2} maxLength={100} placeholder="Indiranagar"/></label>
    <label>Primary category (AI may add up to two related categories)<select name="category">{noticeCategories.map(category=><option key={category}>{category}</option>)}</select></label>
    <label>Description: include timing, public venue and offer terms<textarea name="description" required minLength={20} maxLength={2000} rows={6}/></label>
    <label>Expiry day (ends at midnight India time, within 30 days)<input name="expiresAt" type="date" required/></label>
    <fieldset><legend>Public venue location (optional)</legend><p>Use a public venue, not your home. We retain only an approximate neighbourhood cell. Notices without coordinates appear in area searches, but not distance searches.</p><div className="market-coordinate-fields"><label>Latitude<input name="latitude" type="number" step="any" min={-85} max={85} placeholder="12.97"/></label><label>Longitude<input name="longitude" type="number" step="any" min={-180} max={180} placeholder="77.64"/></label></div></fieldset>
    <label><span><input name="reservationsEnabled" type="checkbox"/> Accept free reservation requests for one person</span><small>Enable only if you can review requests in your local desk and confirm availability. Include event timing or visit arrangements in the description. A request is not a guaranteed seat. Paper Shapers charges no reservation fee or commission; your venue charges must be stated clearly.</small></label>
    <label>Promotional image (optional)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"/><small>JPEG, PNG or WebP, up to 8 MB. Resized before upload and compressed again on the server. No private information, nudity, harmful content, or images you do not own.</small></label>
    <label><span><input name="policyAccepted" type="checkbox" required/> I am 18 or older, have permission to publish this content, and accept the <a href="/noticeboard/safety">posting policy</a> and <a href="/terms">terms</a>. I understand that the content and optional image are sent to the configured AI review provider.</span></label>
    <button className="button button--dark" disabled={busy}>{busy?'Checking notice…':'Submit notice'}</button><p role="status">{message}</p>
  </form>;
}

