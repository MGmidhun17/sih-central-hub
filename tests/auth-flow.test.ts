import test from 'node:test';
import assert from 'node:assert/strict';
import { APIError, authErrorMessage, signInDestination } from '../src/lib/auth-flow';

test('Google and email sign-in preserve existing role and approval state', async () => {
  for (const role of ['student','teacher','admin']) {
    const profile={uid:'existing-user',role,approved:false};
    const result=await signInDestination(async()=>profile);
    assert.equal(result?.path,`/dashboard/${role}`);
    assert.equal(result?.profile,profile);
    assert.equal(result?.profile.approved,false);
  }
});
test('only a missing authenticated profile starts onboarding', async () => {
  assert.equal(await signInDestination(async()=>{throw new APIError(403,'Complete your registration first.');}),null);
  for(const error of [new APIError(401,'Session expired.'),new APIError(403,'This account is being removed.'),new APIError(503,'Service unavailable.'),new Error('Network unavailable')]) {
    await assert.rejects(()=>signInDestination(async()=>{throw error;}),error);
  }
});
test('Google cancellation, blocked popup, domain and account conflicts are actionable', () => {
  assert.match(authErrorMessage({code:'auth/popup-closed-by-user'}),/cancelled/);
  assert.match(authErrorMessage({code:'auth/popup-blocked'}),/Allow pop-ups/);
  assert.match(authErrorMessage({code:'auth/unauthorized-domain'}),/authorized domains/);
  assert.match(authErrorMessage({code:'auth/operation-not-allowed'}),/enable/);
  assert.match(authErrorMessage({code:'auth/account-exists-with-different-credential'}),/existing method/);
});
