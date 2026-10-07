import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";
import { createElement as h } from "react";

const html = htm.bind(h);

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
                    <span class="meta">${[p.tags[0], monthYear(p.updated)].filter(Boolean).join(" · ")}</span>
                  </li>`,
                )}
              </ul>`
            : html`<p class="note">Nothing here yet.</p>`}

      ${site?.links?.length
        ? html`<footer>
            <hr />
            <nav>${site.links.map((l) => html`<a key=${l.href} href=${l.href} target=${l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">${l.label}</a>`)}</nav>
          </footer>`
        : null}
    </main>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
