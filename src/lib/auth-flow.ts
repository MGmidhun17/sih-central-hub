import type { Profile } from "./types";

export class APIError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Only an authenticated account with no application profile needs onboarding.
// Network failures, deletion and permission errors must never create a profile.
export async function signInDestination(loadProfile: () => Promise<unknown>) {
  try {
    const profile = await loadProfile() as Profile;
    return { profile, path: `/dashboard/${profile.role}` };
  } catch (error) {
    if (error instanceof APIError && error.status === 403 && error.message === "Complete your registration first.") return null;
    throw error;
  }
}

export function authErrorMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled. You can try again.",
    "auth/cancelled-popup-request": "A sign-in window is already open. Finish there or try again.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups for this website and try again.",
    "auth/unauthorized-domain": "Google sign-in is not enabled for this website address. Ask the owner to add it to Firebase Authentication’s authorized domains.",
    "auth/operation-not-allowed": "This sign-in method is disabled. Ask the owner to enable it in Firebase Authentication.",
    "auth/account-exists-with-different-credential": "This email already uses another sign-in method. Sign in using your existing method to keep the same account.",
    "auth/email-already-in-use": "An account already uses this email. Log in or use Forgot password.",
    "auth/network-request-failed": "Could not connect to sign-in. Check your connection and try again.",
    "auth/too-many-requests": "Too many sign-in attempts. Please wait before trying again.",
    "auth/user-disabled": "This account has been disabled. Contact the project owner.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "Unable to sign in. Please try again.");
}
