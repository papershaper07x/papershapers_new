import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
async function walk(directory){const found=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const name=path.join(directory,entry.name);if(entry.isDirectory())found.push(...await walk(name));else if(entry.name.endsWith('.nft.json'))found.push(name);}return found;}
const traces=await walk(path.join(root,'.next','server'));
if(!traces.length)throw new Error('Run npm run build before the deployment audit.');
const forbidden=['backend','data','local-reference-archive','work','.agents'].map(name=>path.join(root,name)+path.sep);
const rows=[];const problems=[];
for(const trace of traces){
 const manifest=JSON.parse(await fs.readFile(trace,'utf8'));let bytes=0;
 for(const file of new Set(manifest.files.map(file=>path.resolve(path.dirname(trace),file)))){
  if(forbidden.some(prefix=>file.toLowerCase().startsWith(prefix.toLowerCase()))||path.basename(file).startsWith('.env'))problems.push('A trace includes private/backend-only material.');
  const stat=await fs.stat(file);if(stat.isFile())bytes+=stat.size;
 }
 if(bytes>200*1024*1024)problems.push('A trace exceeds the repository 200 MiB review budget.');
 rows.push({trace:path.relative(root,trace).replaceAll('\\','/'),bytes});
}
rows.sort((a,b)=>b.bytes-a.bytes);
console.log(JSON.stringify({platform:process.platform,traces:rows.length,largest:rows.slice(0,5),problems:[...new Set(problems)],scope:'Local Next traces only; excludes Vercel runtime overhead and is not a Linux deployment measurement.'},null,2));
if(problems.length)process.exitCode=1;
