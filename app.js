import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";
import { createElement as h } from "react";

const html = htm.bind(h);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

function useJson(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetch(url, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: ${r.status}`))))
      .then(setData)
      .catch(setError);
  }, [url]);
  return [data, error];
}

function Tile({ page }) {
  return html`
    <a class="tile" href=${page.href}>
      <span class="eyebrow">${fmtDate(page.updated)}</span>
      <h3>${page.title}</h3>
      ${page.description ? html`<p>${page.description}</p>` : null}
      <span class="tile-foot">
        <span class="tags">${page.tags.map((t) => html`<span class="tag" key=${t}>${t}</span>`)}</span>
        <span class="open">Open →</span>
      </span>
    </a>
  `;
}

function App() {
  const [site] = useJson("site.json");
  const [index, error] = useJson("pages.json");
  const [q, setQ] = useState("");

  const pages = index?.pages ?? [];
  const shown = pages.filter(
    (p) =>
      !q || `${p.title} ${p.description} ${p.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()),
  );

  useEffect(() => {
    if (site?.name) document.title = site.name;
  }, [site]);

  return html`
    <header class="hero wrap">
      <div class="eyebrow">${site?.tagline ?? ""}</div>
      <h1>${site?.name ?? ""}<span>.</span></h1>
      ${site?.bio ? html`<p class="bio">${site.bio}</p>` : null}
      ${site?.links?.length
        ? html`<nav class="links">${site.links.map((l) => html`<a key=${l.href} href=${l.href} target="_blank" rel="noopener noreferrer">${l.label} ↗</a>`)}</nav>`
        : null}
    </header>

    <main class="wrap">
      <div class="shelf-head">
        <h2>Pages <span class="count">${pages.length}</span></h2>
        ${pages.length > 3
          ? html`<input class="search" type="search" placeholder="Search pages" aria-label="Search pages" value=${q} onInput=${(e) => setQ(e.target.value)} />`
          : null}
      </div>
      ${error
        ? html`<p class="empty">Couldn't load the page list. If you're running this locally, build first with <code>node scripts/build.mjs</code>.</p>`
        : !index
          ? html`<p class="empty">Loading…</p>`
          : shown.length
            ? html`<div class="tiles">${shown.map((p) => html`<${Tile} key=${p.slug} page=${p} />`)}</div>`
            : html`<p class="empty">${pages.length ? "No pages match." : "No pages yet. Add an .html file to the p/ folder and push."}</p>`}
    </main>

    <footer class="foot wrap">
      <span>© ${new Date().getFullYear()} ${site?.name ?? ""}</span>
      <span>${index?.generated ? `Updated ${fmtDate(index.generated)}` : ""}</span>
    </footer>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
