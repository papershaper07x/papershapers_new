"use client";
import { siteHref } from "../../lib/seo";
import {useState} from 'react';
import Link from 'next/link';
const routes={
  home:[{label:'I want to study',title:'Start with the chapters you know.',body:'Choose your class, subject and chapters, then build a practice paper. Your attempts stay in your study desk.',href:siteHref('/papershapers/tests/new'),action:'Choose my chapters'},{label:'I want to explore nearby',title:'Make a plan around your area.',body:'Browse offers, classes, events and community ideas. You can look around without an account.',href:siteHref('/noticeboard#board'),action:'Explore the local board'}],
  study:[{label:'I am practising',title:'A focused paper is a good first step.',body:'Pick the chapters your school has covered. Start with a shorter paper, then review your answers alongside the feedback.',href:siteHref('/papershapers/tests/new'),action:'Create a practice paper'},{label:'I teach a group',title:'Bring your class into a Live Room.',body:'Use a common practice paper for the group and review submissions with your own judgement.',href:siteHref('/papershapers/for-teachers'),action:'Explore teacher tools'}]
};
export function StartHere({variant}:{variant:'home'|'study'}) {
 const [selected,setSelected]=useState(0);const choices=routes[variant];const choice=choices[selected];
 return <section className="start-here page-shell" aria-labelledby={`start-${variant}`}><div><p className="kicker">A useful next step</p><h2 id={`start-${variant}`}>What brings you here?</h2><div className="start-here__choices" role="group" aria-label="Choose your starting point">{choices.map((item,index)=><button type="button" key={item.label} aria-pressed={selected===index} onClick={()=>setSelected(index)}>{item.label}<span aria-hidden="true">↗</span></button>)}</div></div><div className="start-here__answer" aria-live="polite"><span className="start-here__number">0{selected+1}</span><h3>{choice.title}</h3><p>{choice.body}</p><Link className="text-link" href={choice.href}>{choice.action} →</Link></div></section>;
}
