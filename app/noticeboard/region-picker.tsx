"use client";
import {useState} from 'react';
import {indiaRegions} from '../../lib/india-regions';
export function RegionPicker({state,city,onChange,required=false}:{state:string;city:string;onChange:(state:string,city:string)=>void;required?:boolean}){
 const [other,setOther]=useState(false);
 return <><label>State or union territory<select name="state" required={required} value={state} onChange={event=>{setOther(false);onChange(event.target.value,'');}}><option value="">{required?'Choose a state / UT':'All states / UTs'}</option>{Object.keys(indiaRegions).map(region=><option key={region}>{region}</option>)}</select></label><label>City<select name={other?undefined:'city'} required={required} disabled={!state} value={other?'other':city} onChange={event=>{setOther(event.target.value==='other');onChange(state,event.target.value==='other'?'':event.target.value);}}><option value="">{required?'Choose a city':'All cities'}</option>{(indiaRegions[state] ?? []).map(name=><option key={name}>{name}</option>)}<option value="other">Another city / town</option></select></label>{other&&<label>City or town name<input name="city" value={city} onChange={event=>onChange(state,event.target.value)} minLength={2} maxLength={80} required={required}/></label>}</>;
}
