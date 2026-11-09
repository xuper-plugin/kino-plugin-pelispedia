// @ts-check
// Kino plugin: Pelispedia -- movies and series in Spanish (Latino, Castilian or subtitled) from pelispedia.is.
// Home rows, a section of its own, categories (genres), search, details, seasons and episodes come from the site, whose covers are TMDB's.
// A title offers up to three options (one per language); each is a small page on the site that holds the video player's address.
// Those players are opened with plain requests (./extractors).

import { SITE, GENRES, parseCards, parseTitle, parseEpisodes, parseOptions, parseEmbed } from "./pelispedia.js";
import { extractorFor } from "./extractors/index.js";
import { makeReq, UA } from "./util/http.js";
import { searchWithTerms } from "./util/terms.js";
import { homeWithin } from "./util/home.js";

// Kino waits for every request a call left running before it delivers the call's answer (quickjs-kt joins the pending async work), so a Home that
// gave up on a slow row at its own budget was still held until that row's request ended, or retried: measured on users' devices Home ran 21-34 s
// with rows logged as "skipped: its source did not answer in time", and Kino threw the whole answer away at 20 s. Asking Kino to drop what a call
// leaves running (the prelude reads this flag after every call; Kino 0.9.55 and later, an older one ignores it) lets the answer leave at the budget.
globalThis.__kinoDropPendingFetches = true;


const CACHE_MS = 10 * 60 * 1000;
const RESOLVE_MS = 40000;
const PAGE = 18;

// ---- i18n ----

const STRINGS = {
  es: {
    news: "Novedades", movies: "Películas", series: "Series", genres: "Géneros", recentMovies: "Películas", recentSeries: "Series", more: "Más",
    lat: "Latino", sub: "Subtitulado", cast: "Castellano", episode: "Episodio",
    heroText: "Películas y series en español, con estrenos al día.",
    unavailable: "El servicio no está disponible en este momento.", noEpisodes: "No se encontraron episodios de esta serie.", noStreams: "Ningún servidor de este título abrió. Prueba más tarde.",
    statusLine: "Listas guardadas: {n}", cacheCleared: "Caché vaciada.",
  },
  en: {
    news: "What's new", movies: "Movies", series: "Series", genres: "Genres", recentMovies: "Movies", recentSeries: "Series", more: "More",
    lat: "Latino", sub: "Subtitled", cast: "Castilian", episode: "Episode",
    heroText: "Movies and series in Spanish, with new releases.",
    unavailable: "The service is not available right now.", noEpisodes: "No episodes found for this series.", noStreams: "No server of this title opened. Try again later.",
    statusLine: "Lists kept: {n}", cacheCleared: "Cache cleared.",
  },
};
const t = (key) => {
  const lang = String(kino.lang || "").toLowerCase().startsWith("es") ? "es" : "en";
  return STRINGS[lang][key] || STRINGS.es[key] || key;
};

// ---- helpers ----

async function getPage(url, headers) {
  const r = await kino.fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "es-MX,es;q=0.9", ...(headers || {}) }, timeoutMs: 15000 });
  if (!r.ok) throw kino.error("unavailable", `Pelispedia ${r.status} ${url}`, { userMessage: t("unavailable") });
  return r.text();
}

async function cached(key, fn) {
  try {
    const raw = kino.storage.get("c:" + key);
    const e = raw ? JSON.parse(raw) : null;
    if (e && Date.now() - e.at < CACHE_MS) return e.v;
  } catch (_) { /* no cache */ }
  const v = await fn();
  if (Array.isArray(v) && !v.length) return v; // an empty answer may be a throttle or a hiccup: not kept
  try { kino.storage.set("c:" + key, JSON.stringify({ at: Date.now(), v }), { ttlMs: CACHE_MS }); } catch (_) { /* a full storage only costs a refetch */ }
  return v;
}

const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hash36 = (s) => { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0; return h.toString(36); };

function toItem(card, genreName) {
  const item = {
    id: "pp-" + (fold(card.slug).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "t") + "-" + hash36(card.kind + card.slug),
    ref: (card.kind === "movie" ? "m:" : "s:") + card.slug, title: card.title, kind: card.kind,
  };
  if (card.poster) item.poster = card.poster;
  if (card.year) item.year = String(card.year);
  if (card.rating) item.rating = card.rating;
  if (card.quality) { item.quality = card.quality.slice(0, 20); item.badges = [card.quality]; }
  if (genreName) item.genres = [genreName];
  return item;
}

// ---- the lists ----

const LISTS = {
  peliculas: { path: "/cartelera-peliculas/", titleKey: "recentMovies", genre: "peliculas" },
  series: { path: "/cartelera-series/", titleKey: "recentSeries", genre: "series" },
};

/** `{ path, title, genre }` for a browse ref ("list:<name>" or "genre:<slug>"); null for anything else. */
function refOf(ref) {
  const m = /^(list|genre):([a-z0-9-]+)$/.exec(String(ref || ""));
  if (!m) return null;
  if (m[1] === "list") { const l = LISTS[m[2]]; return l ? { ...l, title: t(l.titleKey) } : null; }
  const g = GENRES.find((x) => x[0] === m[2]);
  return g ? { path: "/category/" + g[0] + "/", title: g[1], genre: undefined, genreName: g[1] } : null;
}

async function listPage(def, page) {
  const url = SITE + def.path + (page > 1 ? "page/" + page + "/" : "");
  const cards = await cached(`l:${def.path}:${page}`, async () => parseCards(await getPage(url)));
  return { cards, more: cards.length >= PAGE };
}

const safeRow = async (id, fn) => { try { return await fn(); } catch (e) { kino.log("row " + id + ": " + (e && e.message)); return null; } };

async function rowOf(id, ref, genre) {
  const def = refOf(ref);
  const { cards } = await listPage(def, 1);
  const items = cards.slice(0, 20).map((c) => toItem(c, def.genreName));
  return items.length ? { id, title: def.title, items, ref, genre: genre || def.genre || "peliculas" } : null;
}

// ---- exports ----

export async function home() {
  return homeWithin([
    () => safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    () => safeRow("series", () => rowOf("series", "list:series")),
    () => safeRow("accion", () => rowOf("accion", "genre:accion", "accion")),
    () => safeRow("terror", () => rowOf("terror", "genre:terror", "terror")),
    () => safeRow("comedia", () => rowOf("comedia", "genre:comedia", "comedia")),
  ]);
}

export async function browse(ref, cursor) {
  const def = refOf(ref);
  if (!def) return { items: [] };
  const page = cursor ? Math.max(1, parseInt(cursor, 10) || 1) : 1;
  const { cards, more } = await listPage(def, page);
  return { items: cards.map((c) => toItem(c, def.genreName)), next: more ? String(page + 1) : undefined };
}

async function searchOne(arg) {
  const q = String((typeof arg === "string" ? arg : arg && arg.q) || "").trim();
  const within = typeof arg === "object" && arg && arg.within ? refOf(arg.within) : null;
  if (q.length < 2) return [];
  const cards = await cached("s:" + q.toLowerCase(), async () => parseCards(await getPage(`${SITE}/?s=${encodeURIComponent(q)}`)));
  const only = within && within.path === LISTS.peliculas.path ? "movie" : within && within.path === LISTS.series.path ? "series" : null;
  return cards.filter((c) => !only || c.kind === only).slice(0, 40).map((c) => toItem(c));
}

export const search = (arg) => searchWithTerms(arg, searchOne);

// ---- the plugin's own section, categories and details ----

export async function section({ tab } = {}) {
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

export async function categories() {
  return GENRES.map(([slug, name]) => ({ id: "g-" + slug, title: name, ref: "genre:" + slug }));
}

const slugOf = (ref, prefix) => { const m = new RegExp(`^${prefix}:([^:/?#]+)$`).exec(String(ref || "")); return m ? m[1] : null; };
const titlePage = (kind, slug) => cached("p:" + kind + slug, async () => parseTitle(await getPage(`${SITE}/${kind === "movie" ? "pelicula" : "serie"}/${slug}/`)));

/** A movie's own page: synopsis, genres, year, runtime and the wide picture. */
export async function details(ref) {
  const slug = slugOf(ref, "m");
  if (!slug) return null;
  const p = await titlePage("movie", slug);
  if (!p) return null;
  const out = { overview: p.overview || undefined, genres: p.genres.length ? p.genres : undefined, poster: p.poster || undefined, backdrop: p.backdrop || undefined, year: p.year ? String(p.year) : undefined, runtimeMinutes: p.runtimeMinutes };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

export async function episodes(ref) {
  const slug = slugOf(ref, "s");
  if (!slug) throw kino.error("not_found", "unknown ref: " + ref);
  const p = await titlePage("series", slug);
  const list = [];
  for (const s of (p && p.seasons) || []) {
    const html = await cached(`e:${s.post}:${s.season}`, async () => {
      const r = await kino.fetch(`${SITE}/wp-admin/admin-ajax.php`, {
        method: "POST", timeoutMs: 15000, body: `action=action_select_season&season=${s.season}&post=${s.post}`,
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Referer: `${SITE}/serie/${slug}/` },
      });
      if (!r.ok) throw kino.error("unavailable", "Pelispedia seasons " + r.status, { userMessage: t("unavailable") });
      return parseEpisodes(await r.text());
    });
    list.push(...html);
  }
  if (!list.length) throw kino.error("not_found", "no episodes for " + slug, { userMessage: t("noEpisodes") });
  const series = { title: p.title || undefined, poster: p.poster || undefined, backdrop: p.backdrop || undefined, overview: p.overview || undefined, genres: p.genres.length ? p.genres : undefined, year: p.year ? String(p.year) : undefined };
  for (const k of Object.keys(series)) if (series[k] === undefined) delete series[k];
  return {
    series,
    episodes: list.map((e) => {
      const ep = { season: e.season, number: e.number, ref: `e:${e.slug}`, title: `${t("episode")} ${e.number}` };
      if (e.thumb) ep.still = e.thumb;
      return ep;
    }),
  };
}

// ---- resolve ----

const labelOf = (o) => `${t(o.lang)} · ${(o.host || "").replace(/^www\./, "")}`;

function pageOf(ref) {
  let m = /^m:([^:/?#]+)$/.exec(ref);
  if (m) return `${SITE}/pelicula/${m[1]}/`;
  m = /^e:([^:/?#]+)$/.exec(ref);
  return m ? `${SITE}/capitulo/${m[1]}/` : null;
}

/** The options of a page in the order to try them (the preferred language first), each with the address of its player. */
async function optionsOf(pageUrl, req) {
  const options = parseOptions(await getPage(pageUrl, { Referer: SITE + "/" }));
  let pref = "lat";
  try { pref = String(kino.config.get("audio") || "lat"); } catch (_) { pref = "lat"; }
  const rank = (o) => (o.lang === pref ? 0 : o.lang === "lat" ? 1 : o.lang === "cast" ? 2 : 3);
  const sorted = options.map((o, i) => ({ ...o, i })).sort((a, b) => rank(a) - rank(b) || a.i - b.i);
  const out = [];
  for (const o of sorted) {
    try {
      const r = await req(o.url, { headers: { Referer: pageUrl } });
      if (!r.ok) continue;
      const embed = parseEmbed(await r.text());
      if (embed) out.push({ ...o, embed, host: new URL(embed).hostname });
    } catch (_) { /* an option whose page does not answer is skipped */ }
  }
  return out;
}

/** `ref` is a movie ("m:<slug>"), an episode ("e:<slug>") or one of their other options ("c:<ref>@<i>"). */
export async function resolve(ref) {
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
    if (!ex) { failures.push(`${o.host}: no extractor`); continue; }
    try {
      const out = await ex.extract(o.embed, req, kino);
      if (!out) { failures.push(`${o.host}: no stream`); continue; }
      const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...(out.headers || {}) }, label: labelOf(o) };
      if (out.subtitles) stream.subtitles = out.subtitles;
      if (out.durationMs) stream.durationMs = out.durationMs;
      if (only == null) {
        const others = options.map((_, j) => j).filter((j) => j !== i);
        if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(options[j]) }));
      }
      return stream;
    } catch (e) {
      failures.push(`${o.host}: ${(e && e.code) || ""} ${(e && e.message) || e}`.trim());
    }
  }
  kino.log(`resolve ${base} failed: ${failures.join("; ")}`);
  throw kino.error("not_found", "no option opened for " + pageUrl, { userMessage: t("noStreams") });
}

// ---- Ajustes ▸ Pelispedia ----

export async function settingsStatus() {
  let n = 0;
  try { n = kino.storage.keys().filter((k) => k.startsWith("c:")).length; } catch (_) { /* no storage */ }
  return { info: t("statusLine").replace("{n}", String(n)) };
}

export async function action(key) {
  if (key === "clearCache") {
    try { for (const k of kino.storage.keys()) if (k.startsWith("c:")) kino.storage.remove(k); } catch (_) { /* nothing to clear */ }
    return { message: t("cacheCleared") };
  }
  return { message: "" };
}
