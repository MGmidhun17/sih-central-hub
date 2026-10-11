import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
export function adminServices() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase server is not configured.");
  const existing = getApps().find((a) => a.name === "hackrepo-server");
  const emulator =
    process.env.NODE_ENV !== "production" &&
    !!process.env.FIRESTORE_EMULATOR_HOST;
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST)
  )
    throw new Error("Emulators are forbidden in production.");
  const app =
    existing ??
    initializeApp(
      emulator
        ? { projectId }
        : {
            projectId,
            credential: cert({
              projectId,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(
                /\\n/g,
                "\n",
              ),
            }),
          },
      "hackrepo-server",
    );
  return { auth: getAuth(app), db: getFirestore(app) };
}
