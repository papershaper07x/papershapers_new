"use client";
import {useState} from 'react';
export function ReportForm({id}:{id:string}) {
 const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
 return <form className="market-compose-form" onSubmit={async event => {
 event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true);
 try {const response = await fetch('/api/marketplace/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,reason:data.get('reason')})}); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage('Report received for review.');} catch(error){setMessage(error instanceof Error ? error.message : 'Could not report.');} finally {setBusy(false);}
 }}><label>Reason<textarea name="reason" required minLength={10} maxLength={1000} rows={5}/></label><button className="button button--dark" disabled={busy || !id}>{busy ? 'Sending…' : 'Send report'}</button><p role="status">{message}</p><a href={`/auth?next=${encodeURIComponent('/noticeboard/report?id='+id)}`}>Sign in to report</a></form>;
}
