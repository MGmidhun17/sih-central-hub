import { NextResponse } from "next/server";
import { saveProject } from "./save-project";
import { importFiles } from "./file-import";
import { FieldPath } from "firebase-admin/firestore";
import { adminServices } from "../firebase/admin";
import {
  authorize,
  optionalUser,
  identity,
  body,
  json,
  HttpError,
  assertActive,
} from "./http";
import {
  registrationSchema,
  analysisSchema,
  reviewSchema,
} from "../validation";
import { isAdmin, isTeacher, canReadProject } from "../policy";
import { currentDomain } from "../taxonomy";
import { analyze } from "./analysis";
import { z } from "zod";
import { importRepository } from "./repository-import";
import { searchProjects, projectAnalytics } from "../discovery";
import type { Profile, Project } from "../types";
const now = () => new Date().toISOString();
const idOK = (id: string) => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    throw new HttpError(400, "Invalid identifier.");
  return id;
};
const projectFrom = (d: FirebaseFirestore.DocumentSnapshot) => {
  const p = { ...d.data(), id: d.id } as Project;
  const domain = currentDomain(p.sihDomain, `${p.title} ${p.abstract} ${p.description}`);
  if (domain !== p.sihDomain && p.analysis) p.analysis = { ...p.analysis, domain, domainConfidence: null, reason: "Domain updated to the current 17-category SIH taxonomy. Re-analyze to refresh the suggestion." };
  return { ...p, sihDomain: domain };
};
async function count(q: FirebaseFirestore.Query) {
  return (await q.count().get()).data().count;
}
function publicProject(p: Project) {
  return { ...p, analysis: null };
}
async function purge(q: FirebaseFirestore.Query) {
  for (;;) {
    const s = await q.limit(200).get();
    if (s.empty) break;
    const b = adminServices().db.batch();
    s.docs.forEach((d) => b.delete(d.ref));
    await b.commit();
  }
}
export async function dispatch(req: Request, parts: string[]) {
  const path = parts.join("/"),
    method = req.method,
    url = new URL(req.url);
  const { db, auth } = adminServices();
  if (path === "auth/register" && method === "POST") {
    const token = await identity(req);
    const input = registrationSchema.parse(await body(req));
    const ref = db.collection("users").doc(token.uid);
    const user = await db.runTransaction(async (tx) => {
      const [s, tombstone] = await Promise.all([
        tx.get(ref),
        tx.get(db.collection("deletedUsers").doc(token.uid)),
      ]);
      if (tombstone.exists || s.data()?.deleting)
        throw new HttpError(
          403,
          "This account is being removed or was deleted.",
        );
      if (s.exists) return s.data();
      const t = now();
      const u: Profile = {
        ...input,
        uid: token.uid,
        email: token.email ?? "",
        approved: input.role === "student",
        rejected: false,
        createdAt: t,
        updatedAt: t,
      };
      tx.create(ref, u);
      return u;
    });
    return json(user);
  }
  if (path === "me" && method === "GET") return json(await authorize(req));
  if (path === "ai/import-repository" && method === "POST") {
    const u = await authorize(req, "student");
    const input = z.object({ githubUrl: z.string().trim().min(10).max(300), excludeProjectId: z.string().max(128).optional() }).strict().parse(await body(req));
    if (input.excludeProjectId) {
      const old = await db.collection("projects").doc(idOK(input.excludeProjectId)).get();
      if (!old.exists || old.data()?.studentId !== u.uid) throw new HttpError(403, "Project does not belong to you.");
    }
    return json(await importRepository(u.uid, input.githubUrl, input.excludeProjectId));
  }
  if (["projects/search", "analytics"].includes(path) && method === "GET") {
    const s = await db.collection("projects").where("status", "==", "approved").orderBy(FieldPath.documentId()).limit(501).get();
    const projects = s.docs.slice(0,500).map(projectFrom);
    if (path === "analytics") return json({ ...projectAnalytics(projects), truncated: s.size > 500 });
    const matched = searchProjects(projects, url.searchParams);
    return json({ items: matched.slice(0,100).map(publicProject), matched: matched.length, scanned: projects.length, truncated: s.size > 500 || matched.length > 100 });
  }
  if (path === "ai/analyze" && method === "POST") {
    const u = await authorize(req, "student");
    const p = analysisSchema.parse(await body(req));
    if (p.excludeProjectId) {
      const s = await db
        .collection("projects")
        .doc(idOK(p.excludeProjectId))
        .get();
      if (!s.exists || s.data()?.studentId !== u.uid)
        throw new HttpError(403, "Project does not belong to you.");
    }
    return json(await analyze(u.uid, p, p.excludeProjectId));
  }
  if (path === "projects" && method === "GET") {
    const mine = url.searchParams.get("mine") === "1",
      queue = url.searchParams.get("queue") === "1";
    let q: FirebaseFirestore.Query = db.collection("projects");
    if (mine) {
      const u = await authorize(req, "student");
      q = q.where("studentId", "==", u.uid);
    } else if (queue) {
      await authorize(req, "teacher");
      q = q.where("status", "==", "pending");
    } else q = q.where("status", "==", "approved");
    q = q.orderBy(FieldPath.documentId());
    const cursor = url.searchParams.get("cursor");
    if (cursor) q = q.startAfter(idOK(cursor));
    const docs = await q.limit(101).get();
    const selected = docs.docs.slice(0, 100);
    return json({
      items: selected.map((d) =>
        mine || queue ? projectFrom(d) : publicProject(projectFrom(d)),
      ),
      nextCursor: docs.size > 100 ? selected.at(-1)?.id : null,
    });
  }
  if (path === "ai/import-files" && method === "POST") return json(await importFiles(req, (await authorize(req,"student")).uid));
  if (path === "projects" && method === "POST") return json(await saveProject(req, await authorize(req,"student")),201);
  if (parts[0] === "projects" && parts[2] === "files" && parts.length === 4 && method === "GET") {
    const id=idOK(parts[1]),kind=parts[3];if(!["source","presentation"].includes(kind))throw new HttpError(404,"File not found.");
    const user=await optionalUser(req),doc=await db.collection("projects").doc(id).get();if(!doc.exists)throw new HttpError(404,"Project not found.");
    const p=projectFrom(doc);if(!canReadProject(p,user,process.env.ADMIN_UID))throw new HttpError(403,"This file is private.");
    const meta=kind==="source"?p.sourceFile:p.presentationFile;if(!meta)throw new HttpError(404,"No file attached.");
    const chunks=await Promise.all(Array.from({length:meta.chunks},(_,i)=>db.collection("projectFiles").doc(`${id}_${kind}_${i}`).get()));
    if(chunks.some(d=>!d.exists))throw new HttpError(404,"Attachment is unavailable.");
    const bytes=Buffer.concat(chunks.map(d=>Buffer.from(d.data()!.bytes)));
    return new NextResponse(new Uint8Array(bytes),{headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store"}});
  }
  if (parts[0] === "projects" && parts[2] === "versions" && parts.length === 3 && method === "GET") {
    const id=idOK(parts[1]),user=await optionalUser(req),base=await db.collection("projects").doc(id).get();
    if(!base.exists||!canReadProject(projectFrom(base),user,process.env.ADMIN_UID))throw new HttpError(403,"Project unavailable.");
    const versions=await db.collection("projects").where("baseProjectId","==",id).limit(100).get();
    return json(versions.docs.map(projectFrom).filter(p=>canReadProject(p,user,process.env.ADMIN_UID)).map(p=>({id:p.id,title:p.title,status:p.status,improvements:p.improvements??""})));
  }
  if (parts[0] === "projects" && parts.length === 2) {
    const id = idOK(parts[1]),
      ref = db.collection("projects").doc(id);
    if (method === "GET") {
      const u = await optionalUser(req);
      const s = await ref.get();
      if (!s.exists) throw new HttpError(404, "Project not found.");
      const p = projectFrom(s);
      if (!canReadProject(p, u, process.env.ADMIN_UID))
        throw new HttpError(403, "This project is not public.");
      const internal =
        !!u &&
        (u.uid === p.studentId ||
          isTeacher(u) ||
          isAdmin(u, process.env.ADMIN_UID));
      const reviews = internal
        ? (
            await db
              .collection("reviews")
              .where("projectId", "==", id)
              .limit(100)
              .get()
          ).docs.map((d) => ({ id: d.id, ...d.data() }))
        : [];
      return json({ project: internal ? p : publicProject(p), reviews });
    }
    if (method === "PATCH") return json(await saveProject(req,await authorize(req,"student"),id));
    if (method === "DELETE") {
      const u = await authorize(req, "student");
      await db.runTransaction(async (tx) => {
        await assertActive(tx, u.uid);
        const s = await tx.get(ref);
        if (!s.exists) throw new HttpError(404, "Project not found.");
        if (s.data()?.studentId !== u.uid || s.data()?.status !== "draft")
          throw new HttpError(403, "Only your own drafts can be deleted.");
        const old=s.data() as Project;
        for(const key of old.duplicateKeys??[])tx.delete(db.collection("projectFingerprints").doc(key));
        for(const kind of ["source","presentation"] as const){const meta=kind==="source"?old.sourceFile:old.presentationFile;for(let i=0;i<(meta?.chunks??0);i++)tx.delete(db.collection("projectFiles").doc(`${id}_${kind}_${i}`));}
        tx.delete(ref);
      });
      return json({ ok: true });
    }
  }
  if (
    parts[0] === "projects" &&
    parts[2] === "review" &&
    parts.length === 3 &&
    method === "POST"
  ) {
    const u = await authorize(req, "teacher");
    const r = reviewSchema.parse(await body(req)),
      ref = db.collection("projects").doc(idOK(parts[1])),
      review = db.collection("reviews").doc();
    await db.runTransaction(async (tx) => {
      const active = await assertActive(tx, u.uid);
      if (!isTeacher(active))
        throw new HttpError(403, "Teacher approval required.");
      const s = await tx.get(ref);
      if (!s.exists) throw new HttpError(404, "Project not found.");
      const p = projectFrom(s);
      await assertActive(tx, p.studentId);
      if (p.studentId === u.uid)
        throw new HttpError(403, "You cannot review your own project.");
      if (p.status !== "pending" || p.revision !== r.revision)
        throw new HttpError(
          409,
          "This project has already changed. Reload before reviewing.",
        );
      tx.create(review, {
        projectId: p.id,
        studentId: p.studentId,
        teacherId: u.uid,
        teacherName: u.name,
        decision: r.decision,
        comments: r.comments,
        createdAt: now(),
      });
      tx.update(ref, {
        status: r.decision,
        revision: p.revision + 1,
        updatedAt: now(),
      });
    });
    return json({ ok: true });
  }
  if (path === "reviews" && method === "GET") {
    const u = await authorize(req, "teacher");
    const s = await db
      .collection("reviews")
      .where("teacherId", "==", u.uid)
      .limit(200)
      .get();
    return json(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  if (parts[0] === "admin") {
    const u = await authorize(req, "admin");
    void u;
    if (path === "admin/stats" && method === "GET") {
      const users = db.collection("users"),
        projects = db.collection("projects");
      const [
        students,
        teachers,
        pendingTeachers,
        projectCount,
        reviews,
        ...statuses
      ] = await Promise.all([
        count(users.where("role", "==", "student")),
        count(
          users.where("role", "==", "teacher").where("approved", "==", true),
        ),
        count(
          users.where("role", "==", "teacher").where("approved", "==", false),
        ),
        count(projects),
        count(db.collection("reviews")),
        ...[
          "draft",
          "pending",
          "changes_requested",
          "approved",
          "rejected",
        ].map((s) => count(projects.where("status", "==", s))),
      ]);
      const rejectedTeachers = await count(
        users
          .where("role", "==", "teacher")
          .where("approved", "==", false)
          .where("rejected", "==", true),
      );
      return json({
        students,
        teachers,
        pendingTeachers: pendingTeachers - rejectedTeachers,
        projects: projectCount,
        reviews,
        statuses: Object.fromEntries(
          ["draft", "pending", "changes_requested", "approved", "rejected"].map(
            (s, i) => [s, statuses[i]],
          ),
        ),
      });
    }
    if (path === "admin/users" && method === "GET") {
      let q: FirebaseFirestore.Query = db
        .collection("users")
        .orderBy(FieldPath.documentId());
      const cursor = url.searchParams.get("cursor");
      if (cursor) q = q.startAfter(idOK(cursor));
      const s = await q.limit(101).get();
      const selected = s.docs.slice(0, 100);
      const items = await Promise.all(
        selected.map(async (d) => {
          const u = d.data() as Profile;
          return {
            ...u,
            projectCount:
              u.role === "student"
                ? await count(
                    db.collection("projects").where("studentId", "==", d.id),
                  )
                : 0,
            reviewCount:
              u.role === "teacher"
                ? await count(
                    db.collection("reviews").where("teacherId", "==", d.id),
                  )
                : 0,
          };
        }),
      );
      return json({
        items,
        nextCursor: s.size > 100 ? selected.at(-1)?.id : null,
      });
    }
    if (parts[1] === "teachers" && parts.length === 3 && method === "PATCH") {
      const input = z
        .object({ approved: z.boolean() })
        .strict()
        .parse(await body(req));
      const ref = db.collection("users").doc(idOK(parts[2]));
      await db.runTransaction(async (tx) => {
        const s = await tx.get(ref);
        if (!s.exists || s.data()?.role !== "teacher" || s.data()?.deleting)
          throw new HttpError(400, "Eligible teacher not found.");
        tx.update(ref, {
          approved: input.approved,
          rejected: !input.approved,
          updatedAt: now(),
        });
      });
      return json({ ok: true });
    }
    if (parts[1] === "users" && parts.length === 3) {
      const uid = idOK(parts[2]),
        ref = db.collection("users").doc(uid);
      if (method === "GET") {
        const s = await ref.get();
        if (!s.exists) throw new HttpError(404, "User not found.");
        const [p, r] = await Promise.all([
          db
            .collection("projects")
            .where("studentId", "==", uid)
            .limit(200)
            .get(),
          db
            .collection("reviews")
            .where("teacherId", "==", uid)
            .limit(200)
            .get(),
        ]);
        return json({
          user: s.data(),
          projects: p.docs.map(projectFrom),
          reviews: r.docs.map((d) => ({ id: d.id, ...d.data() })),
        });
      }
      if (method === "DELETE") {
        if (uid === process.env.ADMIN_UID)
          throw new HttpError(403, "The owner account cannot be deleted.");
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists) throw new HttpError(404, "User not found.");
          if (s.data()?.role === "admin")
            throw new HttpError(403, "Admin accounts cannot be deleted.");
          // A permanent UID-only marker prevents an already-verified,
          // in-flight registration from recreating this profile after deletion.
          tx.set(db.collection("deletedUsers").doc(uid), { deletedAt: now() });
          tx.update(ref, { deleting: true, updatedAt: now() });
        });
        try {
          await auth.updateUser(uid, { disabled: true });
          await auth.revokeRefreshTokens(uid);
        } catch (e) {
          if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
        }
        await purge(db.collection("projectFiles").where("studentId", "==", uid));
        await purge(db.collection("projectFingerprints").where("studentId", "==", uid));
        await purge(db.collection("projects").where("studentId", "==", uid));
        await purge(db.collection("reviews").where("studentId", "==", uid));
        await purge(db.collection("reviews").where("teacherId", "==", uid));
        await purge(db.collection("analysisCache").where("uid", "==", uid));
        await purge(db.collection("aiUsage").where("uid", "==", uid));
        try {
          await auth.deleteUser(uid);
        } catch (e) {
          if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
        }
        await ref.delete();
        return json({ ok: true });
      }
    }
  }
  throw new HttpError(404, "Endpoint not found.");
}
