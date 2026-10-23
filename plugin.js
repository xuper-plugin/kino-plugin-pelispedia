var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/pelispedia.js
var SITE = "https://pelispedia.is";
var GENRES = [
  ["accion", "Acci\xF3n"],
  ["animacion", "Animaci\xF3n"],
  ["aventura", "Aventura"],
  ["ciencia-ficcion", "Ciencia Ficci\xF3n"],
  ["comedia", "Comedia"],
  ["crimen", "Crimen"],
  ["drama", "Drama"],
  ["familia", "Familia"],
  ["fantasia", "Fantas\xEDa"],
  ["romance", "Romance"],
  ["suspense", "Suspense"],
  ["terror", "Terror"]
];
var decode = (s) => String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#8217;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
var text = (s) => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
var img = (u) => !u ? "" : u.startsWith("//") ? "https:" + u : u;
function parseCards(html) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const a of String(html || "").match(/<article class="post[^"]*movies"[\s\S]*?<\/article>/g) || []) {
    const href = /href="https:\/\/pelispedia\.is\/(pelicula|serie)\/([^"\/?#]+)\/?"/.exec(a);
    const title = /<h2 class="entry-title">([\s\S]*?)<\/h2>/.exec(a);
    if (!href || !title || seen.has(href[1] + href[2])) continue;
    seen.add(href[1] + href[2]);
    const pic = /<img[^>]*src="([^"]+)"/.exec(a);
    const year = /<span class="year">\s*(\d{4})/.exec(a);
    const vote = /<span class="vote"><span>[^<]*<\/span>\s*([\d.]+)/.exec(a);
    const q = /<span class="Qlty">([^<]*)/.exec(a);
    out.push({ slug: href[2], kind: href[1] === "pelicula" ? "movie" : "series", title: text(title[1]), year: year ? Number(year[1]) : void 0, poster: pic ? img(pic[1]) : "", rating: vote ? Number(vote[1]) : void 0, quality: q ? text(q[1]) : "" });
  }
  return out;
}
function parseTitle(html) {
  const h = String(html || "");
  const t2 = /<h1 class="entry-title">([\s\S]*?)<\/h1>/.exec(h);
  if (!t2) return null;
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
    title: text(t2[1]),
    overview: ps.sort((a, b) => b.length - a.length)[0] || "",
    genres,
    year: year ? Number(year[1]) : void 0,
    runtimeMinutes: dur ? Number(dur[1]) : void 0,
    poster: poster ? img(poster[1]) : "",
    backdrop: back ? img(back[1]) : "",
    seasons: seasons.sort((a, b) => a.season - b.season)
  };
}
function parseEpisodes(html) {
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
var LABEL = (s) => {
  const f = String(s || "").toLowerCase();
  return /latino/.test(f) ? "lat" : /castellano|espa[nñ]ol/.test(f) ? "cast" : /vose|sub/.test(f) ? "sub" : "sub";
};
function parseOptions(html) {
  const h = String(html || "");
  const labels = [...h.matchAll(/<span class="server">\s*-?\s*([^<]*?)\s*<\/span>/g)].map((m) => m[1]);
  const urls = [...new Set([...h.matchAll(/data-src="(https:\/\/pelispedia\.is\/\?trembed=[^"]+)"/g)].map((m) => decode(m[1])))];
  return urls.map((url, i) => ({ lang: LABEL(labels[i]), url }));
}
function parseEmbed(html) {
  const m = /<iframe[^>]*\bsrc="([^"]+)"/i.exec(String(html || ""));
  return m ? decode(m[1]) : null;
}

// src/extractors/fastream.js
var fastream_exports = {};
__export(fastream_exports, {
  HOSTS: () => HOSTS,
  extract: () => extract
});

// src/util/unpack.js
var ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var toNum = (s, radix) => [...s].reduce((n, ch) => n * radix + ALPHA.indexOf(ch), 0);
function unpack(source) {
  const m = /}\s*\(\s*'((?:\\'|[^'])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'\.split\('\|'\)/.exec(source || "");
  if (!m) return null;
  const payload = m[1].replace(/\\'/g, "'");
  const radix = Number(m[2]);
  const keys = m[4].split("|");
  if (radix < 2 || radix > 62) return null;
  return payload.replace(/\b[0-9a-zA-Z]+\b/g, (w) => {
    const i = toNum(w, radix);
    return Number.isInteger(i) && i >= 0 && keys[i] ? keys[i] : w;
  });
}

// src/extractors/shared.js
var HLS_MIME = "application/vnd.apple.mpegurl";
function fileM3u8(text2, base) {
  const m = /\bfile\s*:\s*["']([^"']+\.m3u8[^"']*)["']/.exec(text2 || "");
  return m ? absolute(m[1], base) : null;
}
function hlsKey(text2, keys, base) {
  for (const k of keys) {
    const m = new RegExp(`["']${k}["']\\s*:\\s*["']([^"']+)["']`).exec(text2 || "");
    if (m) return absolute(m[1].replace(/\\\//g, "/"), base);
  }
  return null;
}
function absolute(href, base) {
  try {
    return new URL(href, base).href;
  } catch (_) {
    return null;
  }
}
function findIn(html, pick) {
  return pick(html) || pick(unpack(html) || "") || null;
}
function miss(kino2, server, reason) {
  if (kino2 && typeof kino2.log === "function") kino2.log("[pelispedia]", server, reason);
  return null;
}
async function pageText(req, url, headers, kino2, server) {
  const r = await req(url, { headers });
  return r.ok ? r.text() : miss(kino2, server || "embed", "status " + r.status);
}
var LANG_CODES = [
  [/^(español|espanol|spanish|castellano|latino|spa|esp?)\b/i, "es"],
  [/^(english|inglés|ingles|eng?)\b/i, "en"],
  [/^(portugu[eê]s|portuguese|pt)\b/i, "pt"],
  // never a bare "por": "Por defecto" is not Portuguese
  [/^(fran[cç]ais|french|franc[eé]s|fre|fra|fr)\b/i, "fr"],
  [/^(italiano|italian|ita|it)\b/i, "it"],
  [/^(deutsch|german|alem[aá]n|ger|deu|de)\b/i, "de"]
];
function langCode(label) {
  const s = String(label || "").trim();
  for (const [re, code] of LANG_CODES) if (re.test(s)) return code;
  return null;
}
function captionTracks(text2, base) {
  const m = /["']?\btracks["']?\s*:\s*\[([\s\S]*?)\]/.exec(text2 || "");
  if (!m) return [];
  const out = [];
  for (const [obj] of m[1].matchAll(/\{[^{}]*\}/g)) {
    const field = (k) => (new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']*)["']`).exec(obj) || [])[1] || "";
    const kind = field("kind").toLowerCase();
    if (kind && kind !== "captions" && kind !== "subtitles") continue;
    const file = field("file");
    const format = (/\.(vtt|srt)(?:[?#]|$)/i.exec(file) || [])[1];
    const label = field("label");
    const lang = langCode(label);
    const url = format && lang ? absolute(file, base) : null;
    if (!url || out.some((t2) => t2.url === url)) continue;
    out.push({ lang, url, label, format: format.toLowerCase() });
  }
  return out;
}
function durationMsOf(text2) {
  const re = /(?<![-\w])duration["']?\s*:\s*["']?(\d+(?:\.\d+)?)(?![\d.])(?!\s*m?s\b)/g;
  for (const m of String(text2 || "").matchAll(re)) {
    const ms = Math.round(Number(m[1]) * 1e3);
    if (ms >= 6e4) return ms;
  }
  return null;
}
function pageExtras(html, base) {
  const unpacked = unpack(html) || "";
  const subs = captionTracks(html, base);
  const subtitles = subs.length ? subs : captionTracks(unpacked, base);
  const durationMs = durationMsOf(html) || durationMsOf(unpacked);
  return { ...subtitles.length ? { subtitles } : {}, ...durationMs ? { durationMs } : {} };
}

// src/extractors/fastream.js
var HOSTS = ["fastream.to"];
async function extract(embedUrl, req, kino2) {
  const html = await pageText(req, embedUrl, { Referer: "https://fastream.to/" }, kino2, "fastream");
  if (html == null) return null;
  const url = findIn(html, (t2) => fileM3u8(t2, embedUrl));
  if (!url) return miss(kino2, "fastream", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { Referer: "https://fastream.to/" }, ...pageExtras(html, embedUrl) };
}

// src/extractors/streamwish.js
var streamwish_exports = {};
__export(streamwish_exports, {
  HOSTS: () => HOSTS2,
  extract: () => extract2
});

// src/util/http.js
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var REQUEST_MS = 8e3;
var MIN_MS = 1500;
function makeReq(kino2, { deadline }) {
  const req = async (url, opts = {}) => {
    const left = deadline - Date.now();
    if (left < MIN_MS) throw kino2.error("timeout", "no time left for " + new URL(url).hostname);
    return kino2.fetch(url, { headers: { "User-Agent": UA, ...opts.headers || {} }, method: opts.method, body: opts.body, timeoutMs: Math.min(REQUEST_MS, left) });
  };
  req.left = () => Math.max(0, deadline - Date.now());
  return req;
}

// src/extractors/streamwish.js
var HOSTS2 = ["embedwish.com", "hlswish.com", "streamwish.com", "streamwish.to", "strwish.com", "wishembed.com", "filelions.com", "hglink.to", "vibuxer.com"];
async function extract2(embedUrl, req, kino2) {
  const u = new URL(embedUrl);
  if (u.hostname === "hglink.to") u.hostname = "vibuxer.com";
  const referer = u.origin + "/";
  const html = await pageText(req, u.href, { Referer: referer }, kino2, "streamwish");
  if (html == null) return null;
  const url = findIn(html, (t2) => hlsKey(t2, ["hls4", "hls2", "hls3"], u.origin) || fileM3u8(t2, u.origin));
  if (!url) return miss(kino2, "streamwish", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { "User-Agent": UA, Referer: referer }, ...pageExtras(html, u.origin) };
}

// src/extractors/vidhide.js
var vidhide_exports = {};
__export(vidhide_exports, {
  HOSTS: () => HOSTS3,
  extract: () => extract3
});
var HOSTS3 = ["vidhide.com", "vidhidepro.com", "vidhideplus.com", "vidhidefast.com", "dintezuvio.com", "minochinos.com", "filelions.to", "morencius.com"];
async function extract3(embedUrl, req, kino2) {
  const u = new URL(embedUrl);
  const html = await pageText(req, embedUrl, { Referer: u.origin + "/" }, kino2, "vidhide");
  if (html == null) return null;
  const url = findIn(html, (t2) => hlsKey(t2, ["hls4", "hls2"], u.origin) || fileM3u8(t2, u.origin));
  if (!url) return miss(kino2, "vidhide", "no playlist in page");
  return { url, mime: HLS_MIME, headers: { Referer: u.origin + "/", Origin: u.origin }, ...pageExtras(html, u.origin) };
}

// src/extractors/index.js
var TABLE = { fastream: fastream_exports, streamwish: streamwish_exports, vidhide: vidhide_exports };
function extractorFor(embedUrl) {
  let host;
  try {
    host = new URL(embedUrl).hostname.replace(/^www\./, "");
  } catch (_) {
    return null;
  }
  for (const [name, mod] of Object.entries(TABLE)) {
    if (mod.HOSTS.some((h) => host === h || host.endsWith("." + h))) return { name, extract: mod.extract };
  }
  return null;
}
var HOSTS4 = Object.values(TABLE).flatMap((m) => m.HOSTS);

// src/util/terms.js
function searchTerms(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const out = [];
  const add = (s) => {
    const v = String(s || "").trim();
    if (v.length >= 2 && !out.some((x) => norm(x) === norm(v))) out.push(v);
  };
  add(q);
  if (arg && typeof arg === "object") {
    add(arg.originalTitle);
    for (const a of Array.isArray(arg.altTitles) ? arg.altTitles : []) add(a);
  }
  add(q.split(/\s*[:\-–—]\s*/)[0]);
  return out.slice(0, 4);
}
async function searchWithTerms(arg, one) {
  for (const q of searchTerms(arg)) {
    const found = await one(arg && typeof arg === "object" ? { ...arg, q } : q);
    if (found.length) return found;
  }
  return [];
}

// src/plugin.js
var CACHE_MS = 10 * 60 * 1e3;
var RESOLVE_MS = 4e4;
var PAGE = 18;
var STRINGS = {
  es: {
    news: "Novedades",
    movies: "Pel\xEDculas",
    series: "Series",
    genres: "G\xE9neros",
    recentMovies: "Pel\xEDculas",
    recentSeries: "Series",
    more: "M\xE1s",
    lat: "Latino",
    sub: "Subtitulado",
    cast: "Castellano",
    episode: "Episodio",
    heroText: "Pel\xEDculas y series en espa\xF1ol, con estrenos al d\xEDa.",
    unavailable: "El servicio no est\xE1 disponible en este momento.",
    noEpisodes: "No se encontraron episodios de esta serie.",
    noStreams: "Ning\xFAn servidor de este t\xEDtulo abri\xF3. Prueba m\xE1s tarde.",
    statusLine: "Listas guardadas: {n}",
    cacheCleared: "Cach\xE9 vaciada."
  },
  en: {
    news: "What's new",
    movies: "Movies",
    series: "Series",
    genres: "Genres",
    recentMovies: "Movies",
    recentSeries: "Series",
    more: "More",
    lat: "Latino",
    sub: "Subtitled",
    cast: "Castilian",
    episode: "Episode",
    heroText: "Movies and series in Spanish, with new releases.",
    unavailable: "The service is not available right now.",
    noEpisodes: "No episodes found for this series.",
    noStreams: "No server of this title opened. Try again later.",
    statusLine: "Lists kept: {n}",
    cacheCleared: "Cache cleared."
  }
};
var t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};
async function getPage(url, headers) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...headers || {} }, timeoutMs: 15e3 });
  if (!r.ok) throw kino.error("unavailable", `Pelispedia ${r.status} ${url}`, { userMessage: t("unavailable") });
  return r.text();
}
async function cached(key, fn) {
  try {
    const raw = kino.storage.get("c:" + key);
    const e = raw ? JSON.parse(raw) : null;
    if (e && Date.now() - e.at < CACHE_MS) return e.v;
  } catch (_) {
  }
  const v = await fn();
  if (Array.isArray(v) && !v.length) return v;
  try {
    kino.storage.set("c:" + key, JSON.stringify({ at: Date.now(), v }), { ttlMs: CACHE_MS });
  } catch (_) {
  }
  return v;
}
var fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
var hash36 = (s) => {
  let h = 5381;
  for (const ch of String(s)) h = (h * 33 ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
};
function toItem(card, genreName) {
  const item = {
    id: "pp-" + (fold(card.slug).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "t") + "-" + hash36(card.kind + card.slug),
    ref: (card.kind === "movie" ? "m:" : "s:") + card.slug,
    title: card.title,
    kind: card.kind
  };
  if (card.poster) item.poster = card.poster;
  if (card.year) item.year = String(card.year);
  if (card.rating) item.rating = card.rating;
  if (card.quality) {
    item.quality = card.quality.slice(0, 20);
    item.badges = [card.quality];
  }
  if (genreName) item.genres = [genreName];
  return item;
}
var LISTS = {
  peliculas: { path: "/cartelera-peliculas/", titleKey: "recentMovies", genre: "peliculas" },
  series: { path: "/cartelera-series/", titleKey: "recentSeries", genre: "series" }
};
function refOf(ref) {
  const m = /^(list|genre):([a-z0-9-]+)$/.exec(String(ref || ""));
  if (!m) return null;
  if (m[1] === "list") {
    const l = LISTS[m[2]];
    return l ? { ...l, title: t(l.titleKey) } : null;
  }
  const g = GENRES.find((x) => x[0] === m[2]);
  return g ? { path: "/category/" + g[0] + "/", title: g[1], genre: void 0, genreName: g[1] } : null;
}
async function listPage(def, page) {
  const url = SITE + def.path + (page > 1 ? "page/" + page + "/" : "");
  const cards = await cached(`l:${def.path}:${page}`, async () => parseCards(await getPage(url)));
  return { cards, more: cards.length >= PAGE };
}
var safeRow = async (id, fn) => {
  try {
    return await fn();
  } catch (e) {
    kino.log("row " + id + ": " + (e && e.message));
    return null;
  }
};
async function rowOf(id, ref, genre) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1);
  const items = cards.slice(0, 20).map((c) => toItem(c, def.genreName));
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}
async function home() {
  return (await Promise.all([
    safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    safeRow("series", () => rowOf("series", "list:series")),
    safeRow("accion", () => rowOf("accion", "genre:accion", "accion")),
    safeRow("terror", () => rowOf("terror", "genre:terror", "terror")),
    safeRow("comedia", () => rowOf("comedia", "genre:comedia", "comedia"))
  ])).filter(Boolean);
}
async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : void 0 };
}
async function searchOne(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/?s=${encodeURIComponent(q)}`)));
  const only = within && within.path === LISTS.peliculas.path ? "movie" : within && within.path === LISTS.series.path ? "series" : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}
var search = (arg) => searchWithTerms(arg, searchOne);
async function section({ tab } = {}) {
  const tabs = [{ id: "novedades", label: t("news") }, { id: "peliculas", label: t("movies") }, { id: "series", label: t("series") }, { id: "generos", label: t("genres") }];
  const chosen = tabs.some((x) => x.id === tab) ? tab : "novedades";
  let rows = [];
  if (chosen === "novedades") rows = await Promise.all([safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")), safeRow("series", () => rowOf("series", "list:series"))]);
  else if (chosen === "peliculas") {
    rows = [await safeRow("peliculas", () => rowOf("peliculas", "list:peliculas"))];
    rows.push(await safeRow("peliculas2", async () => {
      const { cards } = await listPage(refOf("list:peliculas"), 2);
      const items = cards.map((c) => toItem(c));
      return items.length ? { id: "peliculas2", title: `${t("more")} ${t("movies")}`, items, genre: "peliculas" } : null;
    }));
  } else if (chosen === "series") {
    rows = [await safeRow("series", () => rowOf("series", "list:series"))];
    rows.push(await safeRow("series2", async () => {
      const { cards } = await listPage(refOf("list:series"), 2);
      const items = cards.map((c) => toItem(c));
      return items.length ? { id: "series2", title: `${t("more")} ${t("series")}`, items, genre: "series" } : null;
    }));
  } else rows = await Promise.all(GENRES.slice(0, 6).map(([slug]) => safeRow("g-" + slug, () => rowOf("g-" + slug, "genre:" + slug, slug))));
  rows = rows.filter(Boolean);
  const answer = { tabs, tab: chosen, rows };
  const first = rows.flatMap((r) => r.items).find((i) => i.poster);
  if (first) answer.hero = { title: first.title, text: t("heroText"), image: first.poster };
  return answer;
}
async function categories() {
  return GENRES.map(([slug, name]) => ({ id: "g-" + slug, title: name, ref: "genre:" + slug }));
}
var slugOf = (ref, prefix) => {
  const m = new RegExp(`^${prefix}:([^:/?#]+)$`).exec(String(ref || ""));
  return m ? m[1] : null;
};
var titlePage = (kind, slug) => cached("p:" + kind + slug, async () => parseTitle(await getPage(`${SITE}/${kind === "movie" ? "pelicula" : "serie"}/${slug}/`)));
async function details(ref) {
  const slug = slugOf(ref, "m");
  if (!slug) return null;
  const p = await titlePage("movie", slug);
  if (!p) return null;
  const out = { overview: p.overview || void 0, genres: p.genres.length ? p.genres : void 0, poster: p.poster || void 0, backdrop: p.backdrop || void 0, year: p.year ? String(p.year) : void 0, runtimeMinutes: p.runtimeMinutes };
  for (const k of Object.keys(out)) if (out[k] === void 0) delete out[k];
  return out;
}
async function episodes(ref) {
  const slug = slugOf(ref, "s");
  if (!slug) throw kino.error("not_found", "unknown ref: " + ref);
  const p = await titlePage("series", slug);
  const list = [];
  for (const s of p && p.seasons || []) {
    const html = await cached(`e:${s.post}:${s.season}`, async () => {
      const r = await kino.fetch(`${SITE}/wp-admin/admin-ajax.php`, {
        method: "POST",
        timeoutMs: 15e3,
        body: `action=action_select_season&season=${s.season}&post=${s.post}`,
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Referer: `${SITE}/serie/${slug}/` }
      });
      if (!r.ok) throw kino.error("unavailable", "Pelispedia seasons " + r.status, { userMessage: t("unavailable") });
      return parseEpisodes(await r.text());
    });
    list.push(...html);
  }
  if (!list.length) throw kino.error("not_found", "no episodes for " + slug, { userMessage: t("noEpisodes") });
  const series = { title: p.title || void 0, poster: p.poster || void 0, backdrop: p.backdrop || void 0, overview: p.overview || void 0, genres: p.genres.length ? p.genres : void 0, year: p.year ? String(p.year) : void 0 };
  for (const k of Object.keys(series)) if (series[k] === void 0) delete series[k];
  return {
    series,
    episodes: list.map((e) => {
      const ep = { season: e.season, number: e.number, ref: `e:${e.slug}`, title: `${t("episode")} ${e.number}` };
      if (e.thumb) ep.still = e.thumb;
      return ep;
    })
  };
}
var labelOf = (o) => `${t(o.lang)} \xB7 ${(o.host || "").replace(/^www\./, "")}`;
function pageOf(ref) {
  let m = /^m:([^:/?#]+)$/.exec(ref);
  if (m) return `${SITE}/pelicula/${m[1]}/`;
  m = /^e:([^:/?#]+)$/.exec(ref);
  return m ? `${SITE}/capitulo/${m[1]}/` : null;
}
async function optionsOf(pageUrl, req) {
  const options = parseOptions(await getPage(pageUrl, { Referer: SITE + "/" }));
  let pref = "lat";
  try {
    pref = String(kino.config.get("audio") || "lat");
  } catch (_) {
    pref = "lat";
  }
  const rank = (o) => o.lang === pref ? 0 : o.lang === "lat" ? 1 : o.lang === "cast" ? 2 : 3;
  const sorted = options.map((o, i) => ({ ...o, i })).sort((a, b) => rank(a) - rank(b) || a.i - b.i);
  const out = [];
  for (const o of sorted) {
    try {
      const r = await req(o.url, { headers: { Referer: pageUrl } });
      if (!r.ok) continue;
      const embed = parseEmbed(await r.text());
      if (embed) out.push({ ...o, embed, host: new URL(embed).hostname });
    } catch (_) {
    }
  }
  return out;
}
async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const options = await optionsOf(pageUrl, req);
  if (!options.length) throw kino.error("not_found", "no options on " + pageUrl, { userMessage: t("noStreams") });
  const failures = [];
  for (const i of only != null ? [only] : options.map((_, k) => k)) {
    const o = options[i];
    if (!o) continue;
    const ex = extractorFor(o.embed);
    if (!ex) {
      failures.push(`${o.host}: no extractor`);
      continue;
    }
    try {
      const out = await ex.extract(o.embed, req, kino);
      if (!out) {
        failures.push(`${o.host}: no stream`);
        continue;
      }
      const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...out.headers || {} }, label: labelOf(o) };
      if (out.subtitles) stream.subtitles = out.subtitles;
      if (out.durationMs) stream.durationMs = out.durationMs;
      if (only == null) {
        const others = options.map((_, j) => j).filter((j) => j !== i);
        if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(options[j]) }));
      }
      return stream;
    } catch (e) {
      failures.push(`${o.host}: ${e && e.code || ""} ${e && e.message || e}`.trim());
    }
  }
  kino.log(`resolve ${base} failed: ${failures.join("; ")}`);
  throw kino.error("not_found", "no option opened for " + pageUrl, { userMessage: t("noStreams") });
}
async function settingsStatus() {
  let n = 0;
  try {
    n = kino.storage.keys().filter((k) => k.startsWith("c:")).length;
  } catch (_) {
  }
  return { info: t("statusLine").replace("{n}", String(n)) };
}
async function action(key) {
  if (key === "clearCache") {
    try {
      for (const k of kino.storage.keys()) if (k.startsWith("c:")) kino.storage.remove(k);
    } catch (_) {
    }
    return { message: t("cacheCleared") };
  }
  return { message: "" };
}
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  resolve,
  search,
  section,
  settingsStatus
};
