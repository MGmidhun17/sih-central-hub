import test from "node:test";
import assert from "node:assert/strict";
import { parseGitHubUrl } from "../src/lib/github-url";
import { chooseFiles, dependencyEvidence, fetchRepository, type RepositoryEvidence } from "../src/lib/server/github";
import { summarizeRepository } from "../src/lib/server/repository-import";
import { searchProjects, searchScore, projectAnalytics } from "../src/lib/discovery";
import { project } from "./fixtures";
import { similarityText } from "../src/lib/similarity";
import { projectSchema } from "../src/lib/validation";
const sha = "a".repeat(40);
const evidence: RepositoryEvidence = { url:"https://github.com/student/learning-app", name:"learning-app", description:"A student learning platform for classroom practice.", topics:["education"], languages:["TypeScript"], commit:sha, files:[{path:"README.md",text:"# Learning App\nA student learning platform for classroom practice. React and Firebase manage practice questions."},{path:"package.json",text:JSON.stringify({dependencies:{next:"16",react:"19",firebase:"12",tailwindcss:"4","@google/genai":"1"}})}], warnings:[], technologies:["React","Next.js","Firebase","Gemini","Tailwind CSS","TypeScript"] };
test("GitHub URL parser restricts host, credentials, port and repository shape",()=>{
  assert.equal(parseGitHubUrl("https://github.com/student/repository.git/").url,"https://github.com/student/repository");
  for(const u of ["http://github.com/a/b","https://github.com.evil.test/a/b","https://github.com@evil.test/a/b","https://user:pass@github.com/a/b","https://github.com:8080/a/b","https://github.com/a","https://github.com/a/b/tree/main","https://github.com/a/b?q=x","https://github.com/a/b#readme","https://127.0.0.1/a/b","https://github.com/a/%2e%2e"])
    assert.throws(()=>parseGitHubUrl(u),u);
});
test("File selection excludes symlinks, oversized files, vendors and code",()=>{
  const entry=(path:string,size=100,mode="100644")=>({path,size,mode,type:"blob"});
  const chosen=chooseFiles([entry("README.md"),entry("backend/requirements.txt"),entry("package.json"),entry("node_modules/x/package.json"),entry("src/main.ts"),entry(".env"),entry("docs/readme.md",100,"120000"),entry("huge/package.json",100000)]);
  assert.deepEqual(chosen.map(x=>x.path),["README.md","package.json","backend/requirements.txt"]);
  assert.equal(chooseFiles(Array.from({length:15},(_,i)=>entry(`app${i}/package.json`))).length,7);
});
test("Manifest parser detects actual package names and canonical taxonomy",()=>{
  const tags=dependencyEvidence(evidence.files,evidence.languages);
  for(const t of ["React","Next.js","Firebase","Gemini","Tailwind CSS","TypeScript","Node.js"])assert(tags.includes(t),t);
  assert(!tags.includes("Python"));
  assert.doesNotThrow(()=>dependencyEvidence([{path:"package.json",text:"broken json"}],[]));
});
test("GitHub importer pins files to a commit and never follows supplied download URLs",async()=>{
  const calls:string[]=[];
  const request=(async(url: string | URL | Request, init?:RequestInit)=>{
    const u=String(url);calls.push(u);assert(u.startsWith("https://api.github.com/repos/student/learning-app"));assert.equal(init?.redirect,"error");
    if(u.endsWith("/learning-app"))return Response.json({name:"learning-app",description:evidence.description,private:false,default_branch:"main",topics:["education"]});
    if(u.includes("/commits/"))return Response.json({sha});
    if(u.endsWith("/languages"))return Response.json({TypeScript:123});
    if(u.includes("/git/trees/"))return Response.json({tree:evidence.files.map(f=>({path:f.path,type:"blob",mode:"100644",size:f.text.length})),truncated:false});
    const f=evidence.files.find(f=>u.includes(`/contents/${f.path}`))!;
    assert(u.endsWith(`?ref=${sha}`));
    return Response.json({type:"file",encoding:"base64",size:f.text.length,content:Buffer.from(f.text).toString("base64"),download_url:"http://127.0.0.1/secrets"});
  }) as typeof fetch;
  const r=await fetchRepository(evidence.url,request);
  assert.equal(r.commit,sha);assert.equal(r.files.length,2);assert(r.technologies.includes("Next.js"));assert.equal(calls.length,6);
});
test("Private repositories and GitHub rate limits produce actionable errors",async()=>{
  await assert.rejects(fetchRepository(evidence.url,(async()=>Response.json({private:true})) as typeof fetch),/Only public/);
  await assert.rejects(fetchRepository(evidence.url,(async()=>new Response(null,{status:429})) as typeof fetch),/rate limit/);
  await assert.rejects(fetchRepository(evidence.url,(async()=>new Response(null,{status:404})) as typeof fetch),/not found/);
});
test("Missing README and failed optional files remain explicit",async()=>{
  const request=(async(url:string|URL|Request)=>{
    const u=String(url);
    if(u.endsWith("/learning-app"))return Response.json({name:"learning-app",default_branch:"main",private:false});
    if(u.includes("/commits/"))return Response.json({sha});
    if(u.endsWith("/languages"))return Response.json({});
    if(u.includes("/git/trees/"))return Response.json({tree:[{path:"package.json",type:"blob",mode:"100644",size:10}],truncated:true});
    return new Response(null,{status:404});
  }) as typeof fetch;
  const r=await fetchRepository(evidence.url,request);assert.equal(r.files.length,0);assert(r.warnings.some(x=>x.includes("No readable README")));assert(r.warnings.some(x=>x.includes("truncated")));
});
test("Missing Gemini yields valid editable details with explicit fallback label",async()=>{
  const old=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
  try{const r=await summarizeRepository(evidence);assert(projectSchema.safeParse(r.project).success);assert.equal(r.analysis.repository?.summaryMethod,"repository-extract");assert.equal(r.analysis.method,"dictionary");assert(r.project.description.includes("Next.js"));assert.equal(r.analysis.domain,"Smart Education");}
  finally{if(old!==undefined)process.env.GEMINI_API_KEY=old;}
});
test("Gemini summary uses fixed model endpoint, refuses invented tags and validates its output",async()=>{
  const key=process.env.GEMINI_API_KEY,model=process.env.GEMINI_MODEL;process.env.GEMINI_API_KEY="test-key";process.env.GEMINI_MODEL="test-model";
  try{
    const request=(async(url:string|URL|Request,init?:RequestInit)=>{assert(String(url).startsWith("https://generativelanguage.googleapis.com/"));const b=JSON.parse(init?.body as string);assert(b.systemInstruction.parts[0].text.includes("UNTRUSTED DATA"));return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({title:"Learning assistant",abstract:"A learning assistant that supports classroom practice.",description:"A React and Firebase learning platform for classroom practice.",technologies:["ImaginaryDB","Python"],domain:"Smart Education",confidence:.8,reason:"Student learning tools",keywords:["education"]})}]}}]});}) as typeof fetch;
    const r=await summarizeRepository(evidence,request);assert.equal(r.analysis.method,"gemini+dictionary");assert.equal(r.project.title,"Learning assistant");assert(!r.analysis.technologies.includes("Python"));assert(!r.analysis.technologies.includes("ImaginaryDB"));
    const bad=await summarizeRepository(evidence,(async()=>Response.json({candidates:[{content:{parts:[{text:'{"title":"Invalid"}'}]}}]})) as typeof fetch);assert.equal(bad.analysis.method,"dictionary");assert(bad.analysis.notice?.includes("could not complete"));
  }finally{if(key===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=key;if(model===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=model;}
});
test("Smart search resolves aliases and requires all meaningful query terms",()=>{
  const p={...project,title:"Campus learning",abstract:"A classroom practice tool",description:"Student lessons",techStack:["Next.js","Firebase"],sihDomain:"Smart Education",analysis:null};
  assert(searchScore(p,"nextjs")>0);assert(searchScore(p,"education")>0);assert.equal(searchScore(p,"nextjs unicorn"),0);
  assert.equal(searchProjects([p],new URLSearchParams({tech:"Python"})).length,0);
});
test("Analytics aggregates unique owners and technology counts without fabricated metrics",()=>{
  const p={...project,techStack:["React","React"]};const a=projectAnalytics([p,{...p,id:"another"}]);assert.equal(a.total,2);assert.equal(a.students,1);assert.equal(a.technologies[0].value,2);assert.equal(projectAnalytics([]).total,0);
});
test("Similarity excludes common evidence boilerplate from descriptions",()=>{
  assert.equal(similarityText({title:"Waste",abstract:"Recycle",description:"Vision\n\nRepository evidence\nTechnologies: React"}),"Waste Recycle Vision");
});
