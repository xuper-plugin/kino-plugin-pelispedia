import test from "node:test";
import assert from "node:assert/strict";
import { parseCards, parseTitle, parseEpisodes, parseOptions, parseEmbed } from "../src/pelispedia.js";

const CARD = (kind, slug, title, year) => `<article class="post dfx fcl movies"> <header class="entry-header"> <h2 class="entry-title">${title}</h2> <div class="entry-meta"> <span class="vote"><span>TMDB</span> 5.4</span> </div> </header> <div class="post-thumbnail or-1"> <figure> <img loading="lazy" src="//image.tmdb.org/t/p/w500/a.jpg"> </figure> <span class="post-ql"> <span class="Qlty">HD 720P</span> </span> <span class="year">${year}</span> </div> <a href="https://pelispedia.is/${kind}/${slug}/" class="lnk-blk"></a> </article>`;

test("parseCards reads kind, slug, year, rating, quality and a full poster address", () => {
  const c = parseCards(CARD("pelicula", "masterplan", "Master &amp; Plan", 2026) + CARD("serie", "x", "X", 2020) + CARD("pelicula", "masterplan", "dup", 2026));
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { slug: "masterplan", kind: "movie", title: "Master & Plan", year: 2026, poster: "https://image.tmdb.org/t/p/w500/a.jpg", rating: 5.4, quality: "HD 720P" });
  assert.equal(c[1].kind, "series");
});

test("parseTitle reads a series page and its seasons", () => {
  const p = parseTitle(`<h1 class="entry-title">Hamster &amp; Gretel</h1><span class="genres"><a href="x">Comedia</a>, <a href="y">Animación</a></span><span class="year far">2022</span><div class="description"><p>Corta</p><p>La sinopsis más larga de la serie.</p></div><img class="TPostBg" src="//image.tmdb.org/t/p/w1280/b.jpg"><ul><li><a data-post="35667" data-season="1">1</a></li><li><a data-post="35667" data-season="2">2</a></li></ul>`);
  assert.equal(p.title, "Hamster & Gretel");
  assert.deepEqual(p.genres, ["Comedia", "Animación"]);
  assert.equal(p.year, 2022);
  assert.equal(p.overview, "La sinopsis más larga de la serie.");
  assert.equal(p.backdrop, "https://image.tmdb.org/t/p/w1280/b.jpg");
  assert.deepEqual(p.seasons, [{ season: 1, post: "35667" }, { season: 2, post: "35667" }]);
});

test("parseEpisodes reads season, number and slug", () => {
  const e = parseEpisodes(`<li><article class="post dfx fcl episodes"><img src="//image.tmdb.org/t/p/w185/e.jpg"><span class="num-epi">1x2</span><a href="https://pelispedia.is/capitulo/hamster-gretel-temporada-1-capitulo-2/" class="lnk-blk"></a></article></li>`);
  assert.deepEqual(e, [{ slug: "hamster-gretel-temporada-1-capitulo-2", season: 1, number: 2, thumb: "https://image.tmdb.org/t/p/w185/e.jpg" }]);
});

test("parseOptions pairs each player page with its language", () => {
  const o = parseOptions(`<a><span class="server"> -Latino </span></a><a><span class="server"> -VOSE </span></a><iframe data-src="https://pelispedia.is/?trembed=0&#038;trid=1&trtype=1"></iframe><iframe data-src="https://pelispedia.is/?trembed=1&#038;trid=1&trtype=1"></iframe>`);
  assert.deepEqual(o, [{ lang: "lat", url: "https://pelispedia.is/?trembed=0&trid=1&trtype=1" }, { lang: "sub", url: "https://pelispedia.is/?trembed=1&trid=1&trtype=1" }]);
});

test("parseEmbed finds the upper-case iframe", () => {
  assert.equal(parseEmbed('<div class="Video"><IFRAME SRC="https://fastream.to/embed-x.html" FRAMEBORDER=0></IFRAME></div>'), "https://fastream.to/embed-x.html");
  assert.equal(parseEmbed("<html></html>"), null);
});
