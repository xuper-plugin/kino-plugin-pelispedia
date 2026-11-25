// "Más películas" and "Más series" show page 2 of their list: their "Ver más" goes on from page 2, never back to page 1.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createKino } from "../sdk/kino-shim.mjs";

const CARD = (kind, slug) => `<article class="post dfx fcl movies"> <header class="entry-header"> <h2 class="entry-title">${slug}</h2> </header> <div class="post-thumbnail or-1"> <figure> <img loading="lazy" src="//image.tmdb.org/t/p/w500/a.jpg"> </figure> <span class="year">2026</span> </div> <a href="https://pelispedia.is/${kind}/${slug}/" class="lnk-blk"></a> </article>`;

const asked = [];
async function load() {
  const manifest = JSON.parse(readFileSync(new URL("../kino-plugin.json", import.meta.url), "utf8"));
  const real = createKino(manifest, { lang: "es-CO", device: "phone" }).kino;
  globalThis.kino = Object.create(real, { fetch: { value: fetchPage } });
  async function fetchPage(url) {
    asked.push(url);
    const page = Number((/\/page\/(\d+)\//.exec(url) || [0, 1])[1]);
    const kind = url.includes("series") ? "serie" : "pelicula";
    const html = Array.from({ length: 18 }, (_, i) => CARD(kind, `p${page}-t${i}`)).join("");
    return { ok: true, status: 200, text: async () => html };
  }
  return import("../src/plugin.js?vermas=" + Date.now());
}

for (const [tab, row, ref, path] of [["peliculas", "peliculas2", "list:peliculas:p2", "/cartelera-peliculas/"], ["series", "series2", "list:series:p2", "/cartelera-series/"]]) {
  test(`"${row}" carries ${ref} and its Ver más starts at page 2`, async () => {
    const plugin = await load();
    const { rows } = await plugin.section({ tab });
    const second = rows.find((r) => r.id === row);
    assert.equal(second.ref, ref);
    asked.length = 0;
    const p2 = await plugin.browse(ref, null);
    assert.ok(asked.every((u) => u.endsWith(path + "page/2/")), asked.join(" "));
    assert.equal(p2.items[0].ref.split(":")[1], "p2-t0");
    assert.equal(p2.next, "3");
    const p3 = await plugin.browse(ref, p2.next);
    assert.equal(p3.items[0].ref.split(":")[1], "p3-t0");
    // The plain list still starts at page 1.
    assert.equal((await plugin.browse("list:" + tab, null)).items[0].ref.split(":")[1], "p1-t0");
  });
}

test("a page ref outside the list's shape is no list", async () => {
  const plugin = await load();
  assert.deepEqual(await plugin.browse("list:peliculas:p0", null), { items: [] });
  assert.deepEqual(await plugin.browse("list:nope:p2", null), { items: [] });
});
