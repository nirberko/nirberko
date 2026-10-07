// Builds the site into _site/:
//   - copies index.html, app.js, styles.css, site.json, 404.html, CNAME and everything in p/
//   - writes pages.json, the list the home page shows, from each p/*.html file
// Run locally with:  node scripts/build.mjs  then  npx serve _site
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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
// Cache-bust: point index.html at app.js / styles.css with a content hash, so browsers
// load the new files right after a deploy instead of a cached copy.
const hash = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, f))).digest("hex").slice(0, 10);
const indexPath = path.join(OUT, "index.html");
fs.writeFileSync(
  indexPath,
  fs.readFileSync(indexPath, "utf8")
    .replace('href="styles.css"', `href="styles.css?v=${hash("styles.css")}"`)
    .replace('src="app.js"', `src="app.js?v=${hash("app.js")}"`),
);
// Copy pages, injecting a small "back to home" button into each HTML page.
// The source files in p/ are never modified. Opt out per page with "backButton": false in pages.config.json.
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
const backLabel = `← ${site.name ?? "Home"}`.replace(/[<>&"`$\\]/g, "");
const backButton = `
<!-- back button: injected by scripts/build.mjs -->
<script>
(() => {
  const host = document.createElement("site-back-button");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = \`<style>
    a { position: fixed; right: 16px; top: calc(14px + env(safe-area-inset-top, 0px)); z-index: 2147483647;
        display: inline-flex; align-items: center; padding: 8px 14px; border-radius: 999px;
        background: rgba(18, 18, 17, .86); color: #e9e6df; border: 1px solid rgba(255, 255, 255, .1);
        font: 15px/1 "Newsreader", "Iowan Old Style", Georgia, serif; text-decoration: none;
        box-shadow: 0 2px 12px rgba(0, 0, 0, .28); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
    a:hover { background: rgba(18, 18, 17, .97); }
    a:focus-visible { outline: 2px solid #e9e6df; outline-offset: 2px; }
    @media print { a { display: none; } }
  </style><a href="../">${backLabel}</a>\`;
  (document.body || document.documentElement).appendChild(host);
})();
</script>
`;
for (const f of fs.readdirSync(PAGES_DIR)) {
  const src = path.join(PAGES_DIR, f), dest = path.join(OUT, "p", f);
  const slug = f.replace(/\.html$/, "");
  if (f.endsWith(".html") && config[slug]?.backButton !== false) {
    const html = fs.readFileSync(src, "utf8");
    const i = html.toLowerCase().lastIndexOf("</body>");
    fs.writeFileSync(dest, i === -1 ? html + backButton : html.slice(0, i) + backButton + html.slice(i));
  } else {
    fs.cpSync(src, dest, { recursive: true });
  }
}
fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify({ generated: new Date().toISOString(), pages }, null, 2));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

console.log(`Built _site with ${pages.length} page(s):`);
for (const p of pages) console.log(`  /${p.href}  ${p.title}`);
