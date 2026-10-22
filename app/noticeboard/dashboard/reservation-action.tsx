"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function ReservationAction({noticeId,attendeeId,host=false}:{noticeId:string;attendeeId?:string;host?:boolean}){
 const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function act(action:string){setBusy(true);setMessage('');try{const response=await fetch(`/api/marketplace/notices/${noticeId}/engagement`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(host?{userId:attendeeId}:{})})});const data=await response.json();if(!response.ok)throw new Error(data.error);setMessage('Updated.');router.refresh();}catch(error){setMessage(error instanceof Error?error.message:'Could not update.');}finally{setBusy(false);}}
 return <div className="market-activity-actions">{host?<><button type="button" disabled={busy} onClick={()=>act('confirm')}>Confirm one person</button><button type="button" disabled={busy} onClick={()=>act('decline')}>Decline</button></>:<button type="button" disabled={busy} onClick={()=>act('cancel')}>Cancel reservation</button>}<span role="status">{message}</span></div>;
}
