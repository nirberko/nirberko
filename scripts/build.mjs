// Builds the site into _site/:
//   - copies index.html, app.js, styles.css, site.json, 404.html, CNAME and everything in p/
//   - writes pages.json, the list the home page shows, from each p/*.html file
// Run locally with:  node scripts/build.mjs  then  npx serve _site
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "_site");
const PAGES_DIR = path.join(ROOT, "p");

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const meta = (html, re) => {
  const m = html.match(re);
  return m ? decode(m[1]) : undefined;
};

function gitDate(file, first) {
  try {
    const args = ["log", "--format=%cI", ...(first ? ["--diff-filter=A"] : ["-1"]), "--", file];
    const out = execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").filter(Boolean);
    return first ? out[out.length - 1] : out[0];
  } catch {
    return undefined;
  }
}

const config = fs.existsSync(path.join(ROOT, "pages.config.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "pages.config.json"), "utf8")) : {};

const pages = fs
  .readdirSync(PAGES_DIR)
  .filter((f) => f.endsWith(".html"))
  .map((file) => {
    const slug = file.replace(/\.html$/, "");
    const full = path.join(PAGES_DIR, file);
    const html = fs.readFileSync(full, "utf8").slice(0, 200_000);
    const stat = fs.statSync(full);
    const over = config[slug] ?? {};
    return {
      slug,
      href: `p/${slug}`,
      title: over.title ?? meta(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? slug.replace(/-/g, " "),
      description:
        over.description ??
        meta(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ??
        meta(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) ??
        "",
      tags: over.tags ?? [],
      order: over.order ?? 1000,
      hidden: !!over.hidden,
      created: gitDate(`p/${file}`, true) ?? stat.mtime.toISOString(),
      updated: gitDate(`p/${file}`, false) ?? stat.mtime.toISOString(),
      size: stat.size,
    };
  })
  .filter((p) => !p.hidden)
  .sort((a, b) => a.order - b.order || b.created.localeCompare(a.created));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "p"), { recursive: true });
for (const f of ["index.html", "app.js", "styles.css", "site.json", "404.html", "CNAME", "favicon.svg"]) {
  if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
for (const f of fs.readdirSync(PAGES_DIR)) fs.cpSync(path.join(PAGES_DIR, f), path.join(OUT, "p", f), { recursive: true });
fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify({ generated: new Date().toISOString(), pages }, null, 2));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

console.log(`Built _site with ${pages.length} page(s):`);
for (const p of pages) console.log(`  /${p.href}  ${p.title}`);
