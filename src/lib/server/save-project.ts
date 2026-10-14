import { duplicateError } from "./duplicates";
import { similarityService, similarityText } from "../similarity";
import { adminServices } from "../firebase/admin";
import { canEditProject } from "../policy";
import { saveSchema } from "../validation";
import { normalizeTechnologies, classifyByRules } from "../taxonomy";
import { assertActive, body, HttpError } from "./http";
import { cacheKey } from "./analysis";
import { fetchRepository } from "./github";
import { multipart, hash, type IncomingFile } from "./file-input";
import { parseGitHubUrl } from "../github-url";
import type { Project, Attachment, Profile, Analysis, ProjectInput } from "../types";
const CHUNK=512*1024;
export function contentDuplicateKey(p:ProjectInput) {
  const normalize=(s:string)=>s.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
  return "text_"+hash(normalize(p.abstract)+"\n"+normalize(p.description.split("\n\nRepository evidence")[0])+"\n"+normalize(p.improvements??""));
}
export function duplicateKeys(p:ProjectInput,source?:string,repoRevision?:string) {
  const keys:string[]=[];
  if(source)keys.push("source_"+source);
  if(p.githubUrl&&repoRevision)keys.push("repo_"+hash(parseGitHubUrl(p.githubUrl).url.toLowerCase()+"@"+repoRevision));
  if(!keys.length)keys.push(contentDuplicateKey(p));
  return keys;
}
export function attachment(file:IncomingFile):Attachment{return {name:file.name,size:file.bytes.length,digest:file.digest,chunks:Math.ceil(file.bytes.length/CHUNK),text:file.text.slice(0,16000)};}
export async function saveProject(req:Request,user:Profile,id?:string) {
  const uploads=req.headers.get("content-type")?.includes("multipart/form-data")?await multipart(req):undefined;
  let raw:unknown;
  if(uploads){try{raw=JSON.parse(String(uploads.data.get("payload")));}catch{throw new HttpError(400,"Missing or invalid project details.");}}else raw=await body(req);
  const {status,revision,removeSource,removePresentation,...p}=saveSchema.parse(raw);
  if(id&&revision===undefined)throw new HttpError(400,"Revision required.");
  if(p.baseProjectId && (p.improvements?.trim().length??0)<40)throw new HttpError(400,"Describe what the advanced version improves in at least 40 characters.");
  if(!p.baseProjectId && p.improvements)throw new HttpError(400,"Select the original approved project for an advanced version.");
  const {db}=adminServices(),ref=id?db.collection("projects").doc(id):db.collection("projects").doc();
  const oldSnap=id?await ref.get():null,prior=oldSnap?.data() as Project|undefined;
  if(id&&(!prior||!canEditProject(prior,user)))throw new HttpError(403,"You can only edit your own editable projects.");
  if(p.baseProjectId===ref.id)throw new HttpError(400,"A project cannot be its own original version.");
  let repoRevision:string|undefined;
  if(p.githubUrl){try{p.githubUrl=parseGitHubUrl(p.githubUrl).url;}catch{throw new HttpError(400,"Use a public GitHub repository root URL.");}repoRevision=(await fetchRepository(p.githubUrl)).commit;}
  const source=uploads?.files.source,presentation=uploads?.files.presentation;
  const sourceMeta=source?attachment(source):removeSource?null:prior?.sourceFile??null;
  const slides=presentation?attachment(presentation):removePresentation?null:prior?.presentationFile??null;
  const fingerprint=source?.fingerprint??(removeSource?undefined:prior?.sourceFingerprint);
  const keys=duplicateKeys(p,fingerprint,repoRevision);
  const text=[p.title,p.abstract,p.description,p.improvements,source?.text??sourceMeta?.text,slides?.text].filter(Boolean).join("\n");
  const n=normalizeTechnologies(text),d=classifyByRules(text);
  const cache=await db.collection("analysisCache").doc(cacheKey(user.uid,p)).get();
  const cached=cache.data()?.result as Analysis|undefined;
  // File evidence is authoritative for tagging; never reuse an unrelated cached source summary.
  const a:Analysis|null=(sourceMeta||slides)?{...n,...d,method:"dictionary",similarityMethod:"TF-IDF cosine (lexical)",similarProjects:cached?.similarProjects??[],keywords:[],analyzedAt:new Date().toISOString(),notice:"Classification includes the uploaded source/presentation text. Teacher review is required."}:cached??null;
  const compared=await db.collection("projects").where("status","==","approved").limit(200).get();
  const similar=similarityService.compare(similarityText(p),compared.docs.filter(d=>d.id!==ref.id).map(d=>({...d.data(),id:d.id}) as Project));
  if(a){a.similarProjects=similar;a.notice=(a.notice??"")+" Similarity compares up to 200 approved projects; it is not a plagiarism verdict.";}
  // Check pre-upgrade records as well as the atomic fingerprint registry.
  const legacy=await db.collection("projects").where("abstract","==",p.abstract).get();
  for(const doc of legacy.docs){if(doc.id===ref.id)continue;const other=doc.data() as Project;
    if(contentDuplicateKey(p)===contentDuplicateKey(other)&&!fingerprint&&!repoRevision)throw duplicateError({...other,id:doc.id},user);
  }
  if(p.githubUrl){const oldRepos=await db.collection("projects").where("githubUrl","==",p.githubUrl).get();for(const doc of oldRepos.docs){if(doc.id===ref.id)continue;const other=doc.data() as Project;if((other as Project & {repoRevision?:string}).repoRevision===repoRevision || other.analysis?.repository?.commit===repoRevision)throw duplicateError({...other,id:doc.id},user);}}
  let result:Project;
  await db.runTransaction(async tx=>{
    await assertActive(tx,user.uid);
    const fresh=await tx.get(ref),old=fresh.exists?fresh.data() as Project:undefined;
    if(id&&(!old||!canEditProject(old,user)))throw new HttpError(403,"Project cannot be edited.");
    if(old&&old.revision!==revision)throw new HttpError(409,"Project changed. Reload before editing.");
    let base:Project|undefined;
    if(p.baseProjectId){const b=await tx.get(db.collection("projects").doc(p.baseProjectId));base=b.data() as Project|undefined;if(!base||base.status!=="approved")throw new HttpError(400,"Choose an approved original project.");
      if((fingerprint&&base.sourceFingerprint===fingerprint)||(repoRevision&&base.githubUrl===p.githubUrl&&((base as Project & {repoRevision?:string}).repoRevision??base.analysis?.repository?.commit)===repoRevision))throw duplicateError({...base,id:p.baseProjectId},user);
    }
    const claimRefs=keys.map(k=>db.collection("projectFingerprints").doc(k));
    const claims=await Promise.all(claimRefs.map(r=>tx.get(r)));
    for(const claim of claims){const owner=claim.data()?.projectId;if(owner&&owner!==ref.id){const existing=await tx.get(db.collection("projects").doc(owner));if(existing.exists)throw duplicateError({...existing.data(),id:existing.id} as Project,user);}}
    const time=new Date().toISOString();
    result={...p,id:ref.id,status,studentId:user.uid,studentName:user.name,institution:user.institution,techStack:a?.technologies??n.technologies,techCategories:a?.technologyCategories??n.technologyCategories,sihDomain:a?.domain??d.domain,analysis:a,createdAt:old?.createdAt??time,updatedAt:time,submittedAt:status==="pending"?time:old?.submittedAt??null,revision:old?old.revision+1:0,duplicateKeys:keys,...(sourceMeta?{sourceFile:sourceMeta}:{}),...(slides?{presentationFile:slides}:{}),...(fingerprint?{sourceFingerprint:fingerprint}:{}),...(base?{baseProjectTitle:base.title}:{} )};
    tx.set(ref,{...result,...(repoRevision?{repoRevision}:{} )});
    for(const key of old?.duplicateKeys??[])if(!keys.includes(key))tx.delete(db.collection("projectFingerprints").doc(key));
    claimRefs.forEach(r=>tx.set(r,{projectId:ref.id,studentId:user.uid,createdAt:time}));
    for(const kind of ["source","presentation"] as const){const file=uploads?.files[kind],remove=kind==="source"?removeSource:removePresentation,meta=kind==="source"?old?.sourceFile:old?.presentationFile;
      if(file||remove){for(let i=0;i<(meta?.chunks??0);i++)tx.delete(db.collection("projectFiles").doc(`${ref.id}_${kind}_${i}`));}
      if(file)for(let i=0;i<Math.ceil(file.bytes.length/CHUNK);i++)tx.set(db.collection("projectFiles").doc(`${ref.id}_${kind}_${i}`),{projectId:ref.id,studentId:user.uid,bytes:file.bytes.subarray(i*CHUNK,(i+1)*CHUNK)});
    }
  });
  return result!;
}
