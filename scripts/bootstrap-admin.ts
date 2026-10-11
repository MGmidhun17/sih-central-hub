import { adminServices } from "../src/lib/firebase/admin";
const uid = process.argv[2];
if (!uid || uid !== process.env.ADMIN_UID)
  throw new Error(
    "Pass the owner UID and set the same ADMIN_UID in .env.local.",
  );
const { auth, db } = adminServices();
await auth.getUser(uid);
const other = await db.collection("users").where("role", "==", "admin").get();
if (other.docs.some((d) => d.id !== uid))
  throw new Error(
    "Another admin already exists. Resolve the owner identity manually.",
  );
await db.runTransaction(async (tx) => {
  const ref = db.collection("users").doc(uid),
    owner = db.collection("system").doc("owner");
  const [user, lock] = await Promise.all([tx.get(ref), tx.get(owner)]);
  if (!user.exists) throw new Error("Register the owner normally first.");
  if (lock.exists && lock.data()?.uid !== uid)
    throw new Error("A different owner is already configured.");
  tx.set(owner, { uid });
  tx.update(ref, {
    role: "admin",
    approved: true,
    rejected: false,
    updatedAt: new Date().toISOString(),
  });
});
console.log(
  "Owner role assigned. Sign out and sign back in. Keep ADMIN_UID configured; there is no public bootstrap endpoint.",
);
