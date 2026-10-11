"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container section center">
      <h1>Something interrupted the page.</h1>
      <p>Please try again. Your saved projects are unaffected.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
