"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function WithdrawNotice({id}:{id:string}) {
 const router=useRouter();
 const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
 return <div><button type="button" disabled={busy || message==='Withdrawn'} onClick={async()=>{setBusy(true);try{const response=await fetch(`/api/marketplace/notices/${encodeURIComponent(id)}`,{method:'DELETE'});if(!response.ok)throw new Error();setMessage('Withdrawn');router.refresh();}catch{setMessage('Could not withdraw. Try again.');}finally{setBusy(false);}}}>{busy?'Withdrawing…':'Withdraw notice'}</button><p role="status">{message}</p></div>;
}
