import { adminServices } from "../src/lib/firebase/admin";
import { demoProjects } from "../src/lib/demo";
const uid = process.env.SEED_STUDENT_UID;
if (!uid || process.env.SEED_CONFIRM !== "yes")
  throw new Error(
    "Set SEED_STUDENT_UID to a registered test student and SEED_CONFIRM=yes.",
  );
const { db } = adminServices();
const user = await db.collection("users").doc(uid).get();
if (!user.exists || user.data()?.role !== "student" || user.data()?.deleting)
  throw new Error("An active student account is required.");
const b = db.batch();
for (const p of demoProjects) {
  const id = `seed-${p.id}`;
  b.create(db.collection("projects").doc(id), {
    ...p,
    id,
    title: `[Sample] ${p.title}`,
    studentId: uid,
    studentName: user.data()!.name,
    institution: user.data()!.institution,
  });
}
await b.commit();
console.log(
  "Six clearly labeled sample projects created. Re-running refuses to overwrite existing seeds. No fabricated GitHub or demo links were added.",
);
