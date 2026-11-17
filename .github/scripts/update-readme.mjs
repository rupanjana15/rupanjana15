// Fills the auto-updated parts of README.md (between <!-- name:start --> and <!-- name:end -->)
// from my public GitHub activity. Runs every morning from .github/workflows/update-readme.yml,
// or locally with `node .github/scripts/update-readme.mjs`. Uses only Node's built-ins.
import { readFileSync, writeFileSync } from "node:fs";

const USER = "rupanjana15";
const README = "README.md";
const RECENT_COUNT = 5;
// Repos to leave out of the lists: this profile repo, and copies of other people's projects.
const SKIP = new Set(["rupanjana15", "career-ops", "puter", "first-contributions"]);

const headers = { Accept: "application/vnd.github+json", "User-Agent": `${USER}-profile-readme` };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const api = async (path) => {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${path} answered ${response.status}`);
  return response.json();
};

// Dates rather than "3 days ago", so the README only changes when there is something new.
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const fill = (text, name, body, inline = false) => {
  const pattern = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!pattern.test(text)) throw new Error(`README is missing the ${name} markers`);
  return text.replace(pattern, inline ? `$1${body}$2` : `$1\n${body}\n$2`);
};

const repos = (await api(`/users/${USER}/repos?sort=pushed&per_page=50`)).filter(
  (repo) => !repo.fork && !repo.private && !SKIP.has(repo.name)
);

const recent = repos.slice(0, RECENT_COUNT).map((repo) => {
  const name = `**[${repo.name}](${repo.html_url})**`;
  const description = repo.description?.trim();
  const meta = [repo.language, `updated ${formatDate(repo.pushed_at)}`].filter(Boolean).join(" · ");
  return `- ${description ? `${name}: ${description}` : name} <sub>${meta}</sub>`;
});

const current = readFileSync(README, "utf8");
let next = fill(current, "recent", recent.join("\n"));

// Only stamp a new date when something above actually changed.
const withoutStamp = (text) => fill(text, "updated", "", true);
if (withoutStamp(next) !== withoutStamp(current)) {
  next = fill(next, "updated", `last change: ${formatDate(new Date().toISOString())}.`, true);
  writeFileSync(README, next);
  console.log("README updated.");
} else {
  console.log("Nothing new today.");
}
