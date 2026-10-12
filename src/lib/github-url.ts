/** Accept repository roots only. Never fetch the user-supplied URL directly. */
export function parseGitHubUrl(value: string) {
  const u = new URL(value.trim());
  if (u.protocol !== "https:" || u.hostname !== "github.com" || u.port || u.username || u.password || u.search || u.hash)
    throw new Error("Use a public repository URL: https://github.com/owner/repository");
  const parts = u.pathname.replace(/\/$/, "").split("/").slice(1);
  if (parts.length !== 2 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/.test(parts[0]) || !/^[a-zA-Z0-9_.-]{1,100}$/.test(parts[1]))
    throw new Error("Paste the repository root, not a file, branch, or profile link.");
  const owner = parts[0], repo = parts[1].replace(/\.git$/, "");
  if (!repo || repo === "." || repo === "..") throw new Error("Invalid repository name.");
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}
