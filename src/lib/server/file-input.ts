import { dependencyEvidence } from "./github";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { HttpError } from "./http";
export const MAX_FILE = 1024 * 1024;
export const hash = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
const sourceExt = /\.(txt|md|py|js|jsx|ts|tsx|java|c|cpp|h|cs|go|rs|php|rb|swift|kt|dart|html|css|json|yaml|yml|toml|xml|sql|ipynb|r)$/i;
const ignored = /(^|\/)(node_modules|\.git|\.next|dist|build|vendor|venv|\.venv|__pycache__)(\/|$)|(^|\/)(\.env[^/]*|[^/]*\.(pem|key)|[^/]*service.account[^/]*|package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i;
export interface Entry { name: string; data: Buffer }
export interface IncomingFile { name: string; bytes: Buffer; digest: string; fingerprint: string; text: string; files: string[]; kind: "source" | "presentation" }
function fail(message: string): never { throw new HttpError(400, message); }
function crc32(data: Buffer) { let c=0xffffffff; for (const b of data) { c ^= b; for(let j=0;j<8;j++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; }
// Read ZIP members in memory only. No extraction to disk or source execution.
export function readZip(data: Buffer): Entry[] {
  if(data.length>MAX_FILE) fail("ZIP must be 1 MB or smaller.");
  let end=-1;
  for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--) if(data.readUInt32LE(i)===0x06054b50 && i+22+data.readUInt16LE(i+20)===data.length){end=i;break;}
  if(end<0) fail("Invalid ZIP file.");
  const count=data.readUInt16LE(end+10), size=data.readUInt32LE(end+12);let pos=data.readUInt32LE(end+16);
  if(data.readUInt16LE(end+4)||data.readUInt16LE(end+6)||count!==data.readUInt16LE(end+8)||count>500||pos+size!==end) fail("Use a standard ZIP with at most 500 files; ZIP64 and split archives are unsupported.");
  const result:Entry[]=[],names=new Set<string>();let total=0;
  for(let i=0;i<count;i++) {
    if(pos+46>end||data.readUInt32LE(pos)!==0x02014b50) fail("Invalid ZIP directory.");
    const flags=data.readUInt16LE(pos+8),method=data.readUInt16LE(pos+10),crc=data.readUInt32LE(pos+16),compressed=data.readUInt32LE(pos+20),expanded=data.readUInt32LE(pos+24),len=data.readUInt16LE(pos+28),extra=data.readUInt16LE(pos+30),comment=data.readUInt16LE(pos+32),offset=data.readUInt32LE(pos+42),mode=data.readUInt32LE(pos+38)>>>16;
    if(pos+46+len+extra+comment>end) fail("Truncated ZIP directory.");
    const name=data.subarray(pos+46,pos+46+len).toString("utf8");pos+=46+len+extra+comment;
    if(!name||name.includes("\0")||name.includes("\\")||name.startsWith("/")||name.includes(":")||name.split("/").includes("..")||names.has(name.toLowerCase())) fail("ZIP contains an unsafe or repeated file path.");
    names.add(name.toLowerCase());
    if((mode&0xf000)===0xa000||flags&1||![0,8].includes(method)) fail("Encrypted files, links and unsupported ZIP compression are not accepted.");
    total+=expanded;if(total>8*MAX_FILE||expanded>2*MAX_FILE) fail("ZIP expands beyond the 8 MB limit (2 MB per member).");
    if(offset+30>data.length||data.readUInt32LE(offset)!==0x04034b50) fail("Invalid ZIP entry.");
    const n=data.readUInt16LE(offset+26),x=data.readUInt16LE(offset+28),start=offset+30+n+x;
    if(start+compressed>end||data.subarray(offset+30,offset+30+n).toString("utf8")!==name||data.readUInt16LE(offset+8)!==method) fail("Invalid ZIP entry boundaries.");
    let bytes:Buffer;
    try { bytes=method===0?data.subarray(start,start+compressed):inflateRawSync(data.subarray(start,start+compressed),{maxOutputLength:Math.max(expanded,1)}); } catch { fail("ZIP decompression failed or exceeded limits."); }
    if(bytes.length!==expanded||crc32(bytes)!==crc) fail("ZIP file integrity check failed.");
    if(!name.endsWith("/"))result.push({name,data:bytes});
  }
  if(pos!==end) fail("Invalid ZIP directory size.");
  return result;
}
function decode(b:Buffer) { try { const s=new TextDecoder("utf-8",{fatal:true}).decode(b);if(s.includes("\0"))fail("Source files must be UTF-8 text.");return s; }catch{fail("Source files must be UTF-8 text.");} }
function xmlText(xml:string){return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m=>m[1].replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")).join(" ");}
export function inspectFile(name:string,bytes:Buffer,kind:IncomingFile["kind"]):IncomingFile {
  if(!bytes.length||bytes.length>MAX_FILE)fail("Each file must be nonempty and no larger than 1 MB.");
  const clean=name.replace(/[^a-zA-Z0-9_. -]/g,"_").slice(0,120)||"upload";
  let text="",files:string[]=[],fingerprint=hash(bytes);
  if(kind==="presentation") {
    if(/\.pptx$/i.test(name)) {
      const entries=readZip(bytes);if(!entries.some(e=>e.name==="[Content_Types].xml")||!entries.some(e=>e.name==="ppt/presentation.xml"))fail("This is not a valid PPTX presentation.");
      const slides=entries.filter(e=>/^ppt\/slides\/slide\d+\.xml$/.test(e.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
      text=slides.slice(0,60).map((e,i)=>`Slide ${i+1}: ${xmlText(decode(e.data))}`).join("\n").slice(0,16000);files=slides.map(e=>e.name);
    }else if(/\.ppt$/i.test(name)&&bytes.subarray(0,8).equals(Buffer.from("d0cf11e0a1b11ae1","hex"))){text="";files=[clean];}
    else fail("Upload a PowerPoint .pptx or .ppt file. PPTX supports slide-text analysis; PPT supports download only.");
  }else{
    const entries=/\.zip$/i.test(name)?readZip(bytes):[{name:clean,data:bytes}];
    if(entries.some(e=>ignored.test(e.name)&& /(^|\/)(\.env|.*\.(pem|key)|.*service.account)/i.test(e.name)))fail("Remove environment files and credential/key files from the source archive before uploading.");
    const supported=entries.filter(e=>sourceExt.test(e.name)&&!ignored.test(e.name));
    if(!supported.length)fail("No supported source files found. Upload UTF-8 source code or a ZIP containing code/README files.");
    const decoded=supported.map(e=>({name:e.name,text:decode(e.data)}));
    // Root folder/ZIP metadata/filename changes do not make identical code a new version.
    const code=decoded.filter(e=>! /\.(md|txt)$/i.test(e.name));
    fingerprint=hash((code.length?code:decoded).map(e=>hash(e.text.replace(/\r\n/g,"\n").trim())).sort().join("\n"));
    const ordered=decoded.sort((a,b)=>Number(!/readme|package\.json|requirements/i.test(a.name))-Number(!/readme|package\.json|requirements/i.test(b.name))||a.name.localeCompare(b.name));
    const languageByExtension:Record<string,string>={py:"Python",js:"JavaScript",jsx:"JavaScript",ts:"TypeScript",tsx:"TypeScript",java:"Java",c:"C",cpp:"C++",cs:"C#",go:"Go",rs:"Rust",php:"PHP",rb:"Ruby",swift:"Swift",kt:"Kotlin",dart:"Dart",r:"R",html:"HTML",css:"CSS"};
    const languages=[...new Set(ordered.map(e=>languageByExtension[e.name.split(".").pop()?.toLowerCase()??""]).filter(Boolean))];
    const technologies=dependencyEvidence(ordered.slice(0,20).map(e=>({path:e.name,text:e.text.slice(0,14000)})),languages);
    files=ordered.map(e=>e.name);text=[`Detected languages: ${languages.join(", ")}`,`Detected dependencies: ${technologies.join(", ")}`,...ordered.slice(0,20).map(e=>`File: ${e.name}\n${e.text.slice(0,6000)}`)].join("\n\n").slice(0,32000);
  }
  return {name:clean,bytes,digest:hash(bytes),fingerprint,text,files,kind};
}
export async function multipart(req:Request) {
  const limit=2*MAX_FILE+64000; if(Number(req.headers.get("content-length"))>limit)throw new HttpError(413,"Combined upload is too large.");
  const reader=req.body?.getReader();if(!reader)fail("No upload received.");let length=0;const chunks:Uint8Array[]=[];
  for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>limit){await reader.cancel();throw new HttpError(413,"Combined upload exceeds 2 MB plus form fields.");}chunks.push(r.value);}
  let data:FormData;try{data=await new Response(Buffer.concat(chunks),{headers:{"Content-Type":req.headers.get("content-type")??""}}).formData();}catch{fail("Invalid upload form.");}
  const result:Partial<Record<IncomingFile["kind"],IncomingFile>>={};
  for(const key of ["source","presentation"] as const){const values=data.getAll(key);if(values.length>1)fail("Choose one source file/ZIP and one optional presentation.");const file=values[0];if(file instanceof File&&file.size)result[key]=inspectFile(file.name,Buffer.from(await file.arrayBuffer()),key);}
  return {data,files:result};
}
