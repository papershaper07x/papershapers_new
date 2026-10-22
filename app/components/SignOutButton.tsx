"use client";
import {useState} from 'react';
export function SignOutButton() {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function signOut(){
  setBusy(true);setError('');
  try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();window.location.assign('/');}
  catch{setError('Could not sign out. Please try again.');setBusy(false);}
 }
 return <div><button className="signout-button" type="button" disabled={busy} onClick={signOut}>{busy?'Signing out…':'Sign out'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
