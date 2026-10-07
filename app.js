import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";
import { createElement as h } from "react";

const html = htm.bind(h);

const ICONS = {
  linkedin: html`<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>`,
  email: html`<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>`,
};

const monthYear = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";

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

function App() {
  const [site] = useJson("site.json");
  const [index, error] = useJson("pages.json");
  const pages = index?.pages ?? [];

  useEffect(() => {
    if (site?.name) document.title = site.name;
  }, [site]);

  return html`
    <main class="page">
      <header>
        <h1>${site?.name ?? ""}</h1>
        ${site?.tagline ? html`<p class="tagline">${site.tagline}</p>` : null}
      </header>

      ${error
        ? html`<p class="note">Couldn't load the page list.</p>`
        : !index
          ? null
          : pages.length
            ? html`<ul class="pages">
                ${pages.map(
                  (p) => html`<li key=${p.slug}>
                    <a href=${p.href} title=${p.description || undefined}>${p.title}</a>
                    <span class="meta">${monthYear(p.updated)}</span>
                  </li>`,
                )}
              </ul>`
            : html`<p class="note">Nothing here yet.</p>`}

      <footer>
        <hr />
        ${site?.links?.length
          ? html`<nav aria-label="Links">
              ${site.links.map(
                (l) => html`<a key=${l.href} href=${l.href} target=${l.href.startsWith("http") ? "_blank" : undefined} rel=${l.href.startsWith("http") ? "noopener noreferrer" : undefined} aria-label=${l.label} title=${l.label}>
                  ${ICONS[l.icon] ?? l.label}
                </a>`,
              )}
            </nav>`
          : null}
        <p class="copy">© ${new Date().getFullYear()} ${site?.name ?? ""}</p>
      </footer>
    </main>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
