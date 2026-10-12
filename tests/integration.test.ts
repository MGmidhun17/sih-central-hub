import test from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../src/lib/server/api";
import { handled } from "../src/lib/server/http";
import { adminServices } from "../src/lib/firebase/admin";
const enabled =
  !!process.env.FIRESTORE_EMULATOR_HOST &&
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
test(
  "Firebase emulator: complete workflow, authorization, rules and deletion",
  { skip: !enabled },
  async (t) => {
    const { db, auth } = adminServices();
    async function account(name: string) {
      const email = `${name}-${Date.now()}@example.test`;
      const r = await fetch(
        `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: "emulator-only-password",
            returnSecureToken: true,
          }),
        },
      );
      assert(r.ok);
      return (await r.json()) as {
        idToken: string;
        localId: string;
        email: string;
      };
    }
    async function call(
      path: string,
      method = "GET",
      token?: string,
      data?: unknown,
    ) {
      const req = new Request(`http://localhost/api/${path}`, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      const r = await handled(() =>
        dispatch(req, new URL(req.url).pathname.split("/").slice(2)),
      );
      return { status: r.status, data: await r.json() };
    }
    const s = await account("student"),
      other = await account("other"),
      teacher = await account("teacher"),
      owner = await account("owner");
    process.env.ADMIN_UID = owner.localId;
    const register = (token: string, role: string) =>
      call("auth/register", "POST", token, {
        name: "Integration tester",
        institution: "Test college",
        role,
      });
    await t.test("registration cannot assign admin privileges", async () => {
      assert.equal((await register(s.idToken, "admin")).status, 400);
    });
    for (const [u, r] of [
      [s, "student"],
      [other, "student"],
      [teacher, "teacher"],
      [owner, "student"],
    ] as const)
      assert.equal((await register(u.idToken, r)).status, 200);
    await db.collection("users").doc(owner.localId).update({ role: "admin" });
    await t.test(
      "admin APIs reject anonymous and student callers",
      async () => {
        assert.equal((await call("admin/users")).status, 401);
        assert.equal((await call("admin/users", "GET", s.idToken)).status, 403);
      },
    );
    await t.test("teacher requires owner approval", async () => {
      assert.equal(
        (await call("projects?queue=1", "GET", teacher.idToken)).status,
        403,
      );
      assert.equal(
        (
          await call(
            `admin/teachers/${teacher.localId}`,
            "PATCH",
            owner.idToken,
            { approved: true },
          )
        ).status,
        200,
      );
    });
    await t.test("repository import enforces student access and URL validation", async () => {
      const payload = { githubUrl: "https://github.com/example/project" };
      assert.equal((await call("ai/import-repository", "POST", undefined, payload)).status, 401);
      assert.equal((await call("ai/import-repository", "POST", teacher.idToken, payload)).status, 403);
      assert.equal((await call("ai/import-repository", "POST", s.idToken, { githubUrl: "https://127.0.0.1/private" })).status, 400);
    });
    await t.test("repository extraction survives save and stays private before approval", async () => {
      const originalFetch = globalThis.fetch;
      const sha = "a".repeat(40);
      globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
        const u = String(url);
        if (!u.startsWith("https://api.github.com/")) return originalFetch(url, options);
        if (u.endsWith("/project")) return Response.json({name:"Learning project",description:"A learning tool for student classroom practice.",private:false,default_branch:"main"});
        if (u.includes("/commits/")) return Response.json({sha});
        if (u.endsWith("/languages")) return Response.json({TypeScript:500});
        if (u.includes("/git/trees/")) return Response.json({tree:[{path:"README.md",size:100,type:"blob",mode:"100644"}],truncated:false});
        return Response.json({type:"file",size:100,encoding:"base64",content:Buffer.from("A React and Firebase learning tool for student classroom practice.").toString("base64")});
      }) as typeof fetch;
      try {
        const imported = await call("ai/import-repository", "POST", s.idToken, {githubUrl:"https://github.com/example/project"});
        assert.equal(imported.status,200);
        assert.equal(imported.data.analysis.repository.commit,sha);
        const saved = await call("projects", "POST", s.idToken, {...imported.data.project,status:"draft"});
        assert.equal(saved.status,201);
        assert.equal(saved.data.analysis.repository.commit,sha);
        const search = await call("projects/search?q=learning");
        assert.equal(search.status,200);
        assert(!search.data.items.some((p:{id:string})=>p.id===saved.data.id));
        const counts = await call("analytics");
        assert.equal(counts.status,200);
        assert.equal(counts.data.total,0);
      } finally {globalThis.fetch=originalFetch;}
    });
    const input = {
      title: "Campus recycling vision",
      abstract:
        "Classify recyclable campus waste and coordinate efficient collection.",
      description:
        "Python, OpenCV, Next.js and Firebase power camera-based sorting.",
      githubUrl: "",
      presentationUrl: "",
      demoUrl: "",
    };
    const created = await call("projects", "POST", s.idToken, {
      ...input,
      status: "draft",
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    await t.test(
      "private draft is denied to public, another student and teachers",
      async () => {
        for (const token of [undefined, other.idToken, teacher.idToken])
          assert.equal(
            (await call(`projects/${id}`, "GET", token)).status,
            403,
          );
      },
    );
    await t.test("clients cannot inject status or AI fields", async () => {
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "approved",
            revision: 0,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "draft",
            revision: 0,
            analysis: { method: "gemini" },
          })
        ).status,
        400,
      );
    });
    await t.test(
      "dictionary fallback is truthful, cached and content-bound",
      async () => {
        const a = await call("ai/analyze", "POST", s.idToken, {
          ...input,
          excludeProjectId: id,
        });
        assert.equal(a.status, 200);
        assert.equal(a.data.method, "dictionary");
        assert(a.data.technologies.includes("OpenCV"));
        const b = await call("ai/analyze", "POST", s.idToken, {
          ...input,
          excludeProjectId: id,
        });
        assert.equal(b.data.analyzedAt, a.data.analyzedAt);
      },
    );
    await t.test("owner submits and stale edits are rejected", async () => {
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", other.idToken, {
            ...input,
            status: "pending",
            revision: 0,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "pending",
            revision: 0,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "draft",
            revision: 0,
          })
        ).status,
        403,
      );
    });
    await t.test("submitted project is visible in the approved teacher queue and detail", async () => {
      const queue = await call("projects?queue=1", "GET", teacher.idToken);
      assert.equal(queue.status, 200);
      assert(queue.data.items.some((p: {id: string}) => p.id === id));
      const detail = await call(`projects/${id}`, "GET", teacher.idToken);
      assert.equal(detail.status, 200);
      assert.equal(detail.data.project.status, "pending");
      assert.equal((await call("projects?queue=1", "GET", s.idToken)).status, 403);
      assert.equal((await call(`projects/${id}`, "GET", other.idToken)).status, 403);
    });
    await t.test(
      "students cannot review; approved teacher can request changes",
      async () => {
        const body = {
          decision: "changes_requested",
          comments: "Please explain the dataset and evaluation methodology.",
          revision: 1,
        };
        assert.equal(
          (await call(`projects/${id}/review`, "POST", s.idToken, body)).status,
          403,
        );
        assert.equal(
          (await call(`projects/${id}/review`, "POST", teacher.idToken, body))
            .status,
          200,
        );
        assert.equal(
          (await call(`projects/${id}/review`, "POST", teacher.idToken, body))
            .status,
          409,
        );
      },
    );
    await t.test("revision guard protects requested changes", async () => {
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "pending",
            revision: 0,
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await call(`projects/${id}`, "PATCH", s.idToken, {
            ...input,
            status: "pending",
            revision: 2,
          })
        ).status,
        200,
      );
    });
    await t.test(
      "approval publishes project but keeps internal review history private",
      async () => {
        assert.equal(
          (
            await call(`projects/${id}/review`, "POST", teacher.idToken, {
              decision: "approved",
              comments:
                "The methodology is clear and suitable for publication.",
              revision: 3,
            })
          ).status,
          200,
        );
        const p = await call(`projects/${id}`);
        assert.equal(p.status, 200);
        assert.equal(p.data.project.analysis, null);
        assert.deepEqual(p.data.reviews, []);
        assert(
          (await call("projects")).data.items.some(
            (p: { id: string }) => p.id === id,
          ),
        );
      },
    );
    await t.test("approved work is ranked in search and counted in analytics", async () => {
      const search=await call("projects/search?q=nextjs");
      assert.equal(search.status,200);
      assert(search.data.items.some((p:{id:string})=>p.id===id));
      assert(search.data.items.every((p:{analysis:unknown})=>p.analysis===null));
      const counts=await call("analytics");
      assert.equal(counts.status,200);
      assert.equal(counts.data.total,1);
      assert(counts.data.technologies.some((x:{name:string})=>x.name==="Next.js"));
    });
    await t.test("raw source uploads, duplicate rejection, version links, download permissions and cleanup", async () => {
      const upload=async (text:string,payload:Record<string,unknown>,presentation=false) => {
        const data=new FormData();data.set("payload",JSON.stringify(payload));data.set("source",new File([text],"model.py"));
        if(presentation)data.set("presentation",new File([Buffer.concat([Buffer.from("d0cf11e0a1b11ae1","hex"),Buffer.alloc(40)])],"slides.ppt"));
        const request=new Request("http://localhost/api/projects",{method:"POST",headers:{Authorization:`Bearer ${s.idToken}`},body:data});const response=await handled(()=>dispatch(request,["projects"]));return {status:response.status,data:await response.json()};
      };
      const original={...input,title:"Baseline file model",abstract:"A baseline model detects recyclable waste from camera input.",description:"Python baseline for waste classification",status:"pending"};
      const basic=await upload("print('basic model')",original,true);assert.equal(basic.status,201);
      const before=(await db.collection("projects").count().get()).data().count;
      const duplicate=await upload("print('basic model')",{...original,title:"Renamed identical project"});assert.equal(duplicate.status,409);
      assert.equal((await db.collection("projects").count().get()).data().count,before);
      const fileCount=(await db.collection("projectFiles").where("projectId","==",basic.data.id).get()).size;assert.equal(fileCount,2);
      const get=async(token?:string)=>handled(()=>dispatch(new Request(`http://localhost/api/projects/${basic.data.id}/files/source`,{headers:token?{Authorization:`Bearer ${token}`}:{}}),["projects",basic.data.id,"files","source"]));
      assert.equal((await get()).status,403);assert.equal((await get(other.idToken)).status,403);
      const readable=await get(teacher.idToken);assert.equal(readable.status,200);assert.equal(await readable.text(),"print('basic model')");
      assert.equal((await call(`projects/${basic.data.id}/review`,"POST",teacher.idToken,{decision:"approved",comments:"Source reviewed and baseline model approved.",revision:0})).status,200);
      assert.equal((await get()).status,200);
      const upgrade=await upload("print('advanced model with improved classifier')",{...original,title:"Advanced file model",baseProjectId:basic.data.id,improvements:"Adds an improved classifier with additional evaluation and new model capabilities."});assert.equal(upgrade.status,201);
      assert.equal((await db.collection("projects").doc(basic.data.id).get()).data()?.title,original.title);
      const internal=await call(`projects/${basic.data.id}/versions`,"GET",teacher.idToken);assert(internal.data.some((v:{id:string})=>v.id===upgrade.data.id));
      const external=await call(`projects/${basic.data.id}/versions`);assert.equal(external.data.length,0);
      assert.equal((await call(`projects/${upgrade.data.id}/review`,"POST",teacher.idToken,{decision:"approved",comments:"Improved source inspected and approved as a separate version.",revision:0})).status,200);
      assert.equal((await call(`projects/${basic.data.id}/versions`)).data.length,1);
      const draft=await upload("print('discarded draft')",{...original,title:"Temporary draft upload",status:"draft"});assert.equal(draft.status,201);
      assert.equal((await call(`projects/${draft.data.id}`,"DELETE",s.idToken)).status,200);
      assert((await db.collection("projectFiles").where("projectId","==",draft.data.id).get()).empty);
      assert((await db.collection("projectFingerprints").where("projectId","==",draft.data.id).get()).empty);
    });
    await t.test("simultaneous identical submissions create exactly one project", async () => {
      const payload={...input,title:"Concurrent save protection",abstract:"Identical concurrent submission checks are enforced atomically.",description:"A concurrency verification project.",status:"draft"};
      const responses=await Promise.all([call("projects","POST",s.idToken,payload),call("projects","POST",s.idToken,payload)]);
      assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
    });
    await t.test(
      "direct Firestore reads and writes are denied by rules",
      async () => {
        const endpoint = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${s.localId}`;
        const headers = {
          Authorization: `Bearer ${s.idToken}`,
          "Content-Type": "application/json",
        };
        assert.equal((await fetch(endpoint, { headers })).status, 403);
        assert.equal(
          (
            await fetch(endpoint, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                fields: { role: { stringValue: "admin" } },
              }),
            })
          ).status,
          403,
        );
      },
    );
    await t.test("owner cannot be deleted and aggregates return", async () => {
      assert.equal(
        (await call(`admin/users/${owner.localId}`, "DELETE", owner.idToken))
          .status,
        403,
      );
      const result = await call("admin/stats", "GET", owner.idToken);
      assert.equal(result.status, 200);
      assert(result.data.projects >= 1);
    });
    await t.test(
      "daily caps reject new analysis but preserve cached results",
      async () => {
        process.env.AI_USER_DAILY_LIMIT = "1";
        assert.equal(
          (
            await call("ai/analyze", "POST", s.idToken, {
              ...input,
              title: "A completely new recycling project",
            })
          ).status,
          429,
        );
        assert.equal(
          (await call("ai/analyze", "POST", s.idToken, input)).status,
          200,
        );
      },
    );
    await t.test(
      "deleted UID marker prevents profile resurrection",
      async () => {
        await db
          .collection("deletedUsers")
          .doc(other.localId)
          .set({ deletedAt: new Date().toISOString() });
        await db.collection("users").doc(other.localId).delete();
        assert.equal((await register(other.idToken, "student")).status, 403);
        assert(!(await db.collection("users").doc(other.localId).get()).exists);
      },
    );
    await t.test(
      "deletion cascades through Auth, profiles, projects and reviews",
      async () => {
        assert.equal(
          (await call(`admin/users/${s.localId}`, "DELETE", owner.idToken))
            .status,
          200,
        );
        assert(!(await db.collection("users").doc(s.localId).get()).exists);
        assert(
          (await db.collection("deletedUsers").doc(s.localId).get()).exists,
        );
        assert(!(await db.collection("projects").doc(id).get()).exists);
        assert(
          (
            await db
              .collection("reviews")
              .where("studentId", "==", s.localId)
              .get()
          ).empty,
        );
        assert((await db.collection("projectFiles").where("studentId","==",s.localId).get()).empty);
        assert((await db.collection("projectFingerprints").where("studentId","==",s.localId).get()).empty);
        await assert.rejects(auth.getUser(s.localId));
        assert.equal((await call("me", "GET", s.idToken)).status, 401);
      },
    );
  },
);
