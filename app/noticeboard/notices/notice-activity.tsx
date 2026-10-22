"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {Engagement} from '../../../lib/marketplace-engagement';

export function NoticeActivity({id,authenticated,initial}:{id:string;authenticated:boolean;initial:Engagement}) {
 const [activity,setActivity]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[consent,setConsent]=useState(false);
 useEffect(()=>{
  if(!authenticated || initial.isOwner)return;
  // Count an account only when the detail page is visible, never on link prefetch.
  let sent=false;
  const controller=new AbortController();
  function record(){if(document.visibilityState!=='visible'||sent)return;sent=true;fetch(`/api/marketplace/notices/${id}/engagement`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'view'}),signal:controller.signal}).then(async response=>{if(response.ok){const data=await response.json();if(data.engagement)setActivity(previous=>({...previous,views:data.engagement.views}));}}).catch(()=>{});}
  record();document.addEventListener('visibilitychange',record);
  return()=>{controller.abort();document.removeEventListener('visibilitychange',record);};
 },[id,authenticated,initial.isOwner]);
 async function act(action:string){
  setBusy(true);setMessage('');
  try{const response=await fetch(`/api/marketplace/notices/${id}/engagement`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(action==='reserve'?{reservationConsent:consent}:{})})});const data=await response.json();if(!response.ok)throw new Error(data.error);if(data.engagement)setActivity(data.engagement);setMessage(action==='reserve'?'Request sent for one person. It is awaiting organiser confirmation. Updates appear in your local desk.':action==='cancel'?'Reservation cancelled.':action==='interest'?'Interest registered. This is not a reservation.':'Interest removed.');}
  catch(error){setMessage(error instanceof Error?error.message:'Could not update. Please retry.');}finally{setBusy(false);}
 }
 return <section className="market-activity" aria-label="Interest and reservations"><h2>Make a local plan.</h2><p className="market-fee-note">₹0 Paper Shapers reservation fee · 0% platform commission</p>
  <dl className="market-activity-counts"><div><dt>Interested accounts</dt><dd>{activity.interested}</dd></div><div><dt>Signed-in detail views</dt><dd>{activity.views}</dd></div>{activity.enabled&&<><div><dt>Active requests</dt><dd>{activity.requests}</dd></div><div><dt>Confirmed requests</dt><dd>{activity.confirmed}</dd></div></>}</dl>
  <p className="backend-caption">One account per count; organiser activity is excluded. Active requests include confirmed requests. Views are not a total audience estimate. Counts are not an endorsement or proof of attendance.</p>
  {authenticated&&!activity.isOwner&&activity.enabled&&!activity.mineStatus&&<label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/> I am 18 or older, accept the <Link href="/terms">terms</Link>, and agree to share my account name with this organiser for this request.</label>}
  {!authenticated?<Link className="button button--dark" href={`/auth?mode=login&next=${encodeURIComponent(`/noticeboard/notices/${id}`)}`}>Sign in to {activity.enabled?'reserve or register interest':'register interest'}</Link>:activity.isOwner?<p>Manage requests in <Link href="/noticeboard/dashboard">your local desk</Link>.</p>:<div className="market-activity-actions"><button type="button" disabled={busy} aria-pressed={activity.mineInterested} onClick={()=>act(activity.mineInterested?'uninterest':'interest')}>{activity.mineInterested?'Remove interest':'I’m interested'}</button>{activity.enabled&&!activity.mineStatus&&<button type="button" className="button button--dark" disabled={busy||!consent} onClick={()=>act('reserve')}>Reserve — request free</button>}{['requested','confirmed'].includes(activity.mineStatus ?? '')&&<button type="button" disabled={busy} onClick={()=>act('cancel')}>Cancel reservation</button>}</div>}
  {activity.mineStatus&&<p>Your reservation: <strong>{activity.mineStatus==='requested'?'Awaiting organiser confirmation':activity.mineStatus}</strong>. <Link href="/noticeboard/dashboard">View updates →</Link></p>}
  {activity.enabled?<p>Each request is for one person. The organiser must confirm availability and arrangements. No ticket, time slot or payment is issued here. Venue prices, taxes and offer conditions may still apply. Cancel if your plans change.</p>:<p>This organiser has not enabled reservations. Registering interest does not reserve a place.</p>}
  <p role="status" aria-live="polite">{message}</p>
 </section>;
}
