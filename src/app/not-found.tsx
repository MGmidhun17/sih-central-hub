import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container section center">
      <h1>This idea hasn’t landed here.</h1>
      <p>The page you’re looking for does not exist.</p>
      <Link className="button" href="/">
        Back to HackRepo
      </Link>
    </main>
  );
}
