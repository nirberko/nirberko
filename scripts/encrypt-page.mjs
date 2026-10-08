// Turns a page into a private, encrypted page in p/:
//   - inlines the images it references (relative src="..." paths next to the source file)
//   - gzips and encrypts it with AES-256-GCM
//   - writes p/<slug>.html, a small loader that decrypts it in the browser
// The key is never written to the repo. It goes in the link after the "#", which browsers don't send to the server:
//   https://<your-domain>/p/<slug>#<key>
// Run with:  node scripts/encrypt-page.mjs path/to/page.html <slug>
// To update a page and keep its link, pass the old key:  PAGE_KEY=<key> node scripts/encrypt-page.mjs ...
// Keep the source file outside this repo: the repo is public.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [src, slug] = process.argv.slice(2);
if (!src || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Usage: node scripts/encrypt-page.mjs <source.html> <slug>   (slug: lowercase letters, digits, dashes)");
  process.exit(1);
}
if (path.resolve(src).startsWith(ROOT + path.sep)) {
  console.error("Keep the source file outside this repo: the repo is public.");
  process.exit(1);
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
const srcDir = path.dirname(path.resolve(src));
let inlined = 0;
const html = fs
  .readFileSync(src, "utf8")
  .replace(/\bsrc=(["'])([^"':]+?)\1/g, (m, q, rel) => {
    const file = path.join(srcDir, rel);
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type || !fs.existsSync(file)) return m;
    inlined++;
    return `src=${q}data:${type};base64,${fs.readFileSync(file).toString("base64")}${q}`;
  })
  .replace(/<head[^>]*>/i, (m) => `${m}<meta name="robots" content="noindex,nofollow">`);

const key = process.env.PAGE_KEY ? Buffer.from(process.env.PAGE_KEY, "base64url") : crypto.randomBytes(32);
if (key.length !== 32) {
  console.error("PAGE_KEY must be the 43-character key from the page's link.");
  process.exit(1);
}
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const payload = Buffer.concat([iv, cipher.update(zlib.gzipSync(html, { level: 9 })), cipher.final(), cipher.getAuthTag()]);

const loader = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Private page</title>
<style>body{margin:0;min-height:100vh;box-sizing:border-box;display:grid;place-items:center;padding:16px;background:#faf9f5;color:#2b2a26;font:17px/1.5 "Iowan Old Style",Georgia,serif}p{max-width:36ch;text-align:center}</style>
</head>
<body>
<p id="msg">Opening…</p>
<script id="payload" type="application/octet-stream">${payload.toString("base64")}</script>
<script>
// Decrypts the page with the key from the link (#key). The key is kept for this tab only, so a reload still works
// after the address bar is cleaned up or an in-page link replaces the "#".
(async () => {
  const msg = document.getElementById("msg");
  const slot = "page-key:" + location.pathname;
  const fromLink = location.hash.slice(1);
  let key = /^[A-Za-z0-9_-]{43}$/.test(fromLink) ? fromLink : null;
  try { if (key) sessionStorage.setItem(slot, key); else key = sessionStorage.getItem(slot); } catch {}
  if (!key) { msg.textContent = "This page is private. Open it with the full link you were given."; return; }
  try {
    const bytes = (b64) => Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const data = bytes(document.getElementById("payload").textContent.trim());
    const k = await crypto.subtle.importKey("raw", bytes(key), "AES-GCM", false, ["decrypt"]);
    const gz = await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, k, data.slice(12));
    const page = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
    const theme = document.documentElement.getAttribute("data-theme");
    if (fromLink === key) history.replaceState(null, "", location.pathname + location.search);
    document.open();
    document.write(theme ? page.replace(/<html/i, '<html data-theme="' + theme + '"') : page);
    document.close();
  } catch {
    try { sessionStorage.removeItem(slot); } catch {}
    msg.textContent = "This link doesn't open this page. Check that you copied all of it.";
  }
})();
</script>
</body>
</html>
`;

const out = path.join(ROOT, "p", `${slug}.html`);
fs.writeFileSync(out, loader);
console.log(`Wrote p/${slug}.html (${(loader.length / 1024).toFixed(0)} KB, ${inlined} image(s) inlined).`);
console.log(`Private link: https://<your-domain>/p/${slug}#${key.toString("base64url")}`);
