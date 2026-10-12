# Enable Google sign-in — no terminal commands

The updated login and signup pages include **Continue with Google**. Google sign-in must also be enabled in your own Firebase project; code alone cannot switch that setting on.

1. Open https://console.firebase.google.com/ and select the same project used by HackRepo.
2. Open **Authentication → Sign-in method** (or Sign-in providers).
3. Select **Google**, switch **Enable** on, select your project support email if requested, and **Save**. Keep Email/Password enabled if you still want email login.
4. Open **Authentication → Settings → Authorized domains → Add domain**.
5. Add `sihcentralhub20.vercel.app` — hostname only, without `https://` or a path. Add any other domain you actually use. Temporary Vercel preview addresses are different domains and may need their own entry.
6. In Vercel → Project → Settings → Environment Variables, confirm `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` matches the `authDomain` in Firebase → Project settings → General → Your web app → SDK configuration. Normally this is `YOUR_PROJECT_ID.firebaseapp.com`. Do not change it to your Vercel hostname just because you host on Vercel. Keep all existing Firebase variables set to this same project.
7. Deploy this complete source update. If an environment variable changed, redeploy after saving it so the browser bundle uses the new value.
8. Visit `/login`, click **Continue with Google**, and choose an account. Allow the sign-in popup if your browser blocks it.

## Expected behavior

- Existing profile: opens the correct student, teacher or admin dashboard using the stored role. Signing in never changes that role or approval state.
- New Google user: completes full name, institution and Student/Teacher role. Google supplies the name when available; a separate password is not requested.
- New teacher: remains pending until the owner approves them.
- Admin: use the same Firebase account UID already configured in `ADMIN_UID` and the existing Firestore admin profile. Google sign-in does not grant admin privileges based on an email address or a role selection.
- If Firebase reports that the email already uses a different sign-in method, use that existing method. The app does not create a replacement profile or merge accounts itself.
- Cancelled popup, disabled provider, blocked popup, unauthorized domain and connection failures show specific messages.
- Email/password login and password reset remain available. A password-reset email is only useful for accounts configured to use a password.

## Quick checks after deployment

1. Existing student: Google sign-in returns to their own projects.
2. New student: profile completion appears, then the student dashboard opens.
3. New teacher: profile completion appears, then the pending approval screen opens. No review access before owner approval.
4. Sign out, cancel a Google popup, then try again successfully.
5. Try the actual deployed hostname on desktop and mobile browsers. Test the popup and account permissions with your own Firebase settings.

Reference: https://firebase.google.com/docs/auth/web/google-signin

Local tests simulate Google identity with the Firebase Auth emulator. They do not open a real Google consent screen or verify your live configuration.
