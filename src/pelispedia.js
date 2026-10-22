// Parsers for pelispedia.is (a WordPress theme): listing cards, a title's page, a season's episodes and the player options of a page.

export const SITE = "https://pelispedia.is";

/** The site's genres (slug, name). */
export const GENRES = [
  ["accion", "Acción"], ["animacion", "Animación"], ["aventura", "Aventura"], ["ciencia-ficcion", "Ciencia Ficción"], ["comedia", "Comedia"],
  ["crimen", "Crimen"], ["drama", "Drama"], ["familia", "Familia"], ["fantasia", "Fantasía"], ["romance", "Romance"], ["suspense", "Suspense"], ["terror", "Terror"],
];

const decode = (s) => String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#8217;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const text = (s) => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
/** The site writes images as `//image.tmdb.org/...`. */
const img = (u) => (!u ? "" : u.startsWith("//") ? "https:" + u : u);

/** The cards of a listing: `{ slug, kind: "movie"|"series", title, year, poster, rating, quality }`. */
export function parseCards(html) {
  const out = [];
  const seen = new Set();
  for (const a of String(html || "").match(/<article class="post[^"]*movies"[\s\S]*?<\/article>/g) || []) {
    const href = /href="https:\/\/pelispedia\.is\/(pelicula|serie)\/([^"\/?#]+)\/?"/.exec(a);
    const title = /<h2 class="entry-title">([\s\S]*?)<\/h2>/.exec(a);
    if (!href || !title || seen.has(href[1] + href[2])) continue;
    seen.add(href[1] + href[2]);
    const pic = /<img[^>]*src="([^"]+)"/.exec(a);
    const year = /<span class="year">\s*(\d{4})/.exec(a);
    const vote = /<span class="vote"><span>[^<]*<\/span>\s*([\d.]+)/.exec(a);
    const q = /<span class="Qlty">([^<]*)/.exec(a);
    out.push({ slug: href[2], kind: href[1] === "pelicula" ? "movie" : "series", title: text(title[1]), year: year ? Number(year[1]) : undefined, poster: pic ? img(pic[1]) : "", rating: vote ? Number(vote[1]) : undefined, quality: q ? text(q[1]) : "" });
  }
  return out;
}

/** A title's page: overview, genres, year, runtime, cover and wide picture, and the seasons of a series (`{ season, post }`). */
export function parseTitle(html) {
  const h = String(html || "");
  const t = /<h1 class="entry-title">([\s\S]*?)<\/h1>/.exec(h);
  if (!t) return null;
  const genres = [...(/<span class="genres">([\s\S]*?)<\/span>/.exec(h) || [, ""])[1].matchAll(/<a[^>]*>([^<]*)<\/a>/g)].map((m) => text(m[1]));
  const year = /<span class="year[^"]*">\s*(\d{4})/.exec(h);
  const dur = /<span class="duration[^"]*">\s*(\d+)\s*min/.exec(h);
  const desc = /<div class="description">([\s\S]*?)<\/div>/.exec(h);
  const ps = desc ? [...desc[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => text(m[1])).filter(Boolean) : [];
  const back = /TPostBg[^>]*src="([^"]+)"/.exec(h);
  const poster = /<div class="alg-ss">[\s\S]*?<img[^>]*src="([^"]+)"/.exec(h) || /<figure[^>]*>\s*<img[^>]*src="([^"]+)"/.exec(h);
  const seasons = [];
  for (const m of h.matchAll(/<a[^>]*\bdata-post="(\d+)"[^>]*\bdata-season="(\d+)"|<a[^>]*\bdata-season="(\d+)"[^>]*\bdata-post="(\d+)"/g)) {
    const post = m[1] || m[4], season = Number(m[2] || m[3]);
    if (!seasons.some((s) => s.season === season)) seasons.push({ season, post });
  }
  return {
    title: text(t[1]), overview: ps.sort((a, b) => b.length - a.length)[0] || "", genres, year: year ? Number(year[1]) : undefined,
    runtimeMinutes: dur ? Number(dur[1]) : undefined, poster: poster ? img(poster[1]) : "", backdrop: back ? img(back[1]) : "", seasons: seasons.sort((a, b) => a.season - b.season),
  };
}

/** The answer of the site's season request: `{ slug, season, number, title, thumb }` per episode. */
export function parseEpisodes(html) {
  const out = [];
  for (const a of String(html || "").match(/<article[^>]*episodes[\s\S]*?<\/article>/g) || []) {
    const href = /href="https:\/\/pelispedia\.is\/capitulo\/([^"\/?#]+)\/?"/.exec(a);
    const num = /<span class="num-epi">\s*(\d+)x(\d+)/.exec(a);
    if (!href || !num) continue;
    const pic = /<img[^>]*src="([^"]+)"/.exec(a);
    out.push({ slug: href[1], season: Number(num[1]), number: Number(num[2]), thumb: pic ? img(pic[1]) : "" });
  }
  return out;
}

const LABEL = (s) => { const f = String(s || "").toLowerCase(); return /latino/.test(f) ? "lat" : /castellano|espa[nñ]ol/.test(f) ? "cast" : /vose|sub/.test(f) ? "sub" : "sub"; };

/** The player options of a movie or episode page: `{ lang: "lat"|"cast"|"sub", url }` (the embed page on the site itself). */
export function parseOptions(html) {
  const h = String(html || "");
  const labels = [...h.matchAll(/<span class="server">\s*-?\s*([^<]*?)\s*<\/span>/g)].map((m) => m[1]);
  const urls = [...new Set([...h.matchAll(/data-src="(https:\/\/pelispedia\.is\/\?trembed=[^"]+)"/g)].map((m) => decode(m[1])))];
  return urls.map((url, i) => ({ lang: LABEL(labels[i]), url }));
}

/** The video iframe inside a `?trembed=` page (the tag is upper case there). */
export function parseEmbed(html) {
  const m = /<iframe[^>]*\bsrc="([^"]+)"/i.exec(String(html || ""));
  return m ? decode(m[1]) : null;
}
