import { adminServices } from "../firebase/admin";
import { similarityService, similarityText } from "../similarity";
import type { Project } from "../types";
import { multipart } from "./file-input";
import { reserveAnalysisBudget } from "./analysis";
import { summarizeRepository } from "./repository-import";
import { HttpError } from "./http";
import { normalizeTechnologies } from "../taxonomy";
export async function importFiles(req:Request,uid:string){
  const {files}=await multipart(req);const file=files.source??files.presentation;
  if(!file)throw new HttpError(400,"Choose a source file, ZIP, or PowerPoint presentation.");
  if(!file.text)throw new HttpError(400,"This PPT can be attached for download. For automatic text analysis, save it as PPTX and upload that file.");
  await reserveAnalysisBudget(uid);
  const text=[files.source?.text,files.presentation?.text].filter(Boolean).join("\n");
  const result=await summarizeRepository({url:"",name:file.name.replace(/\.[^.]+$/,""),description:"",topics:[],languages:[],commit:file.digest,files:[{path:"README.upload.md",text}],technologies:normalizeTechnologies(text).technologies,warnings:["Uploaded files inspected as text only; code was not executed. Up to 20 source files / 32,000 characters and 60 presentation slides are inspected."]});
  if(result.analysis.repository){result.analysis.repository.files=[...(files.source?.files??[]),...(files.presentation?.files??[])].slice(0,80);result.analysis.repository.warnings.push("File upload import: there is no GitHub repository or commit for this result.");}
  const candidates=await adminServices().db.collection("projects").where("status","==","approved").limit(200).get();
  result.analysis.similarProjects=similarityService.compare(similarityText(result.project),candidates.docs.map(d=>({...d.data(),id:d.id}) as Project));
  result.analysis.notice="Summary from uploaded file evidence. Review it before saving. Original files are stored only if the project passes the duplicate check and saves successfully.";
  return result;
}
