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
var NAMED_ENTITIES = { ndash: "\u2013", mdash: "\u2014", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D", nbsp: " ", iexcl: "\xA1", iquest: "\xBF", laquo: "\xAB", raquo: "\xBB", aacute: "\xE1", eacute: "\xE9", iacute: "\xED", oacute: "\xF3", uacute: "\xFA", ntilde: "\xF1", Aacute: "\xC1", Eacute: "\xC9", Iacute: "\xCD", Oacute: "\xD3", Uacute: "\xDA", Ntilde: "\xD1", uuml: "\xFC" };
var decodeMore = (s) => s.replace(/&#([0-9]{1,7});/g, (m, n) => {
  const c = Number(n);
  return c > 0 && c <= 1114111 ? String.fromCodePoint(c) : m;
}).replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => {
  const c = parseInt(h, 16);
  return c > 0 && c <= 1114111 ? String.fromCodePoint(c) : m;
}).replace(/&([a-z]+);/gi, (m, k) => NAMED_ENTITIES[k] ?? m);
var decode = (s) => decodeMore(String(s || "").replace(/&#0?38;|&amp;/g, "&").replace(/&quot;|&#0?34;/g, '"').replace(/&#0?39;|&#8217;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " "));
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

// src/std/model.js
var MAX_SLIDES = 5;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 20;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https:\/\//;
function cardOf(item) {
  const out = { id: item.id, ref: item.ref, title: item.title, kind: item.kind };
  if (item.poster && HTTPS.test(item.poster)) out.poster = item.poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.badges) out.badges = item.badges;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.ids && item.ids.tmdb) out.ids = { tmdb: item.ids.tmdb };
  if (item.lang) out.lang = item.lang;
  if (item.adult === true) out.adult = true;
  return out;
}
var slidesOf = (rows) => pickSlides(rows, (item) => item.backdrop);
var posterSlidesOf = (rows) => pickSlides(rows, (item) => item.poster);
function slideText(overview, item = {}) {
  const text2 = typeof overview === "string" ? overview.trim() : "";
  if (text2 === "") return [item.year, item.rating ? "\u2605 " + item.rating : null].filter(Boolean).join(" \xB7 ");
  return text2.length <= MAX_SLIDE_TEXT ? text2 : `${text2.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`;
}
function pickSlides(rows, pictureOf) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    for (const item of row.items || []) {
      if (out.length >= MAX_SLIDES) return out;
      const image = pictureOf(item);
      if (item.adult === true || seen.has(item.id) || !image || !HTTPS.test(image)) continue;
      seen.add(item.id);
      out.push({ id: item.id, ref: item.ref, kind: item.kind, title: item.title, image, text: slideText(item.overview, item) });
    }
  }
  return out;
}
var uniform = (items) => items.every((i) => i.backdrop) ? items : items.map(({ backdrop, ...rest }) => rest);
function railsOf(rows) {
  return rows.filter((r) => !r.hidden && r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.titleEn ? { titleEn: r.titleEn } : {},
    ...r.ref ? { ref: r.ref } : {},
    items: uniform(r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf))
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), posterSlides: posterSlidesOf(rows), rails };
}
function playedKey(ref) {
  const m = /^(?:m|s|e):(\d{1,10})(?::|$)/.exec(String(ref || ""));
  return m ? `t:${m[1]}` : String(ref || "");
}
function recentOf(keys, tabs) {
  if (keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        const ks = [card.ref];
        if (card.ids && card.ids.tmdb) ks.push(`t:${card.ids.tmdb}`);
        for (const k of ks) if (!byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/std/strings.js
var WORDS = {
  watch: ["Ver", "Watch"],
  info: ["M\xE1s informaci\xF3n", "More info"],
  recent: ["Continuar viendo", "Continue watching"],
  search: ["Buscar", "Search"],
  searchHint: ["Buscar en {name}", "Search {name}"],
  failed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  retry: ["Reintentar", "Retry"],
  empty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  back: ["Atr\xE1s", "Back"],
  close: ["Cerrar", "Close"],
  settings: ["Ajustes", "Settings"],
  supportTv: ["Si te gusta mi trabajo, escan\xE9alo y ap\xF3yame", "If you like my work, scan it and support me"],
  support: ["Si te gusta mi trabajo, ap\xF3yame", "If you like my work, support me"],
  gateTitle: ["Necesitas el motor de reproducci\xF3n", "You need the playback engine"],
  gateText: [
    "{name} reproduce a trav\xE9s de Kino Resolver (gratis). Inst\xE1lalo una vez y sirve para este y para otros plugins de sitios.",
    "{name} plays through Kino Resolver (free). Install it once and it works here and in other site plugins."
  ],
  gateInstall: ["Instalar Kino Resolver", "Install Kino Resolver"]
};
var fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] != null ? String(vars[k]) : m);
function twin(key, field = "text", vars) {
  const [es, en] = WORDS[key];
  const pick = (i) => vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Array.isArray(v) ? v[i] : v]));
  return { [field]: fill(es, pick(0)), [field + "En"]: fill(en, pick(1)) };
}
var STRING_KEYS = Object.keys(WORDS);

// src/std/view.js
var SUPPORT_URL = "https://ko-fi.com/xuperplugins";
var RESOLVER_REPO = "xuper-plugin/kino-plugin-kino-resolver";
var POLL_MS = 1500;
function brand(cfg) {
  return {
    type: "Row",
    key: "brand",
    gap: 12,
    crossAxisAlignment: "center",
    children: [
      ...cfg.logo ? [{ type: "Image", key: "logo", url: cfg.logo, aspect: cfg.logoAspect || "1:1", fit: "contain", h: 32, alt: cfg.name, altEn: cfg.nameEn || cfg.name }] : [],
      { type: "Text", key: "name", style: "h4", text: cfg.name, textEn: cfg.nameEn || cfg.name }
    ]
  };
}
var tabBar = (tabs, active) => ({
  type: "TabBar",
  key: "tabs",
  divider: false,
  value: active,
  onChanged: "tab",
  tabs: tabs.map((t2) => ({ value: t2.id, label: t2.label, labelEn: t2.labelEn || t2.label }))
});
var iconButton = (key, icon, word, onPressed) => ({ type: "IconButton", key, icon, ...twin(word, "labelText"), ...twin(word, "tooltip"), onPressed });
var searchOpenOps = (tabsInBar) => [
  { hide: "brand" },
  { hide: "searchButton" },
  { hide: "settingsButton" },
  ...tabsInBar ? [{ hide: "tabs" }] : [],
  { show: "closeSearch" },
  { show: "q" },
  { focus: "q" }
];
var searchClosedOps = (tabsInBar) => [
  { hide: "closeSearch" },
  { hide: "q" },
  { clear: "q" },
  { show: "brand" },
  { show: "searchButton" },
  { show: "settingsButton" },
  ...tabsInBar ? [{ show: "tabs" }] : []
];
function supportNode(device) {
  if (device === "tv") return { type: "QrImage", key: "donate", value: SUPPORT_URL, size: "large", ...twin("supportTv", "labelText") };
  return { type: "ElevatedButton", key: "donate", icon: "heart", ...twin("support", "labelText"), onPressed: { go: { url: { href: SUPPORT_URL } } } };
}
var bar = ({ leading, title, actions = [] }) => ({ type: "AppBar", mergeWithKinoBar: true, dense: true, divider: false, leading, title, actions });
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line", width: 120 },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var heroSkeleton = () => ({ type: "Skeleton", key: "heroSkeleton", shape: "block", height: { compact: 200, expanded: 320 } });
var titleOf = (s) => ({ ref: s.ref, kind: s.kind, id: s.id, title: s.title });
var withHeaders = (headers) => headers ? { headers } : {};
var slideNode = (s, headers) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  ...s.logo ? { logo: s.logo } : {},
  title: s.title,
  text: s.text,
  image: s.image,
  ...withHeaders(headers),
  buttons: [
    { type: "ElevatedButton", key: "watch-" + s.id, ...twin("watch", "labelText"), icon: "play", onPressed: { go: { play: titleOf(s) } } },
    { type: "TextButton", key: "info-" + s.id, ...twin("info", "labelText"), onPressed: { go: { title: titleOf(s) } } }
  ]
});
var hero = (slides, headers) => slides.length === 1 ? slideNode(slides[0], headers) : {
  type: "PageView",
  key: "hero" + slides.length,
  autoPlayMs: 6e3,
  children: slides.map((s) => slideNode(s, headers))
};
var rail = (r, key, words, headers) => ({
  type: "titleRail",
  key,
  ...words || { title: r.title, titleEn: r.titleEn || r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  ...withHeaders(headers)
});
function browseView(cfg, { tab, data, recent, pending, failed, searching = false, device = "phone" }) {
  const tv = device === "tv";
  const tabs = cfg.tabs;
  const active = tabs.some((t2) => t2.id === tab) ? tab : tabs[0].id;
  const withTabs = tabs.length > 1;
  const body = [];
  if (data) {
    const h = cfg.imageHeaders;
    if (data.slides.length > 0) body.push(hero(data.slides, h));
    if (recent.length > 0) body.push(rail({ items: recent }, "recent", twin("recent", "title"), h));
    for (const r of data.rails) body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_"), null, h));
    if (data.rails.length === 0) body.push({ type: "Text", key: "empty", ...twin("empty"), color: "muted" });
  } else if (failed) {
    body.push({ type: "MaterialBanner", key: "loadFailed", role: "error", ...twin("failed"), action: { ...twin("retry", "label"), onTap: "retry" } });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  const isBanner = (n) => !!n && (n.type === "heroCard" || n.key === "heroSkeleton" || n.type === "PageView" && String(n.key).startsWith("hero"));
  const banner = body.length > 0 && isBanner(body[0]) ? body.shift() : null;
  const tabsInBar = tv && withTabs;
  const appBar = bar({
    leading: iconButton("close", "close", "close", { go: { close: true } }),
    title: { type: "Row", key: "titleRow", gap: tabsInBar ? 24 : 8, crossAxisAlignment: "center", children: [
      { ...iconButton("closeSearch", "arrow_back", "back", { ui: searchClosedOps(tabsInBar), event: "searchClosed" }), hidden: true },
      brand(cfg),
      ...tabsInBar ? [tabBar(tabs, active)] : [],
      {
        type: "TextField",
        key: "q",
        hidden: true,
        flex: 1,
        kind: "search",
        maxLength: 200,
        ...twin("searchHint", "hintText", { name: [cfg.name, cfg.nameEn || cfg.name] }),
        onSubmitted: "search",
        trailingIcon: "search",
        ...twin("search", "trailingLabel"),
        onTrailingTap: "search"
      }
    ] },
    actions: [
      iconButton("searchButton", "search", "search", { ui: searchOpenOps(tabsInBar), event: "searchOpened" }),
      iconButton("settingsButton", "settings", "settings", "openSettings")
    ]
  });
  return {
    type: "Scaffold",
    ...searching ? { onBack: { ui: searchClosedOps(tabsInBar), event: "searchClosed" } } : {},
    appBar,
    body: { type: "Column", key: "page", children: [
      ...withTabs && !tv ? [{ type: "Column", key: "tabsRow", padding: { compact: 0, expanded: 24 }, children: [tabBar(tabs, active)] }] : [],
      { type: "SingleChildScrollView", key: "browse-" + active, flex: 1, children: [...banner ? [banner] : [], { type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: body }] }
    ] },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function settingsView(cfg, device = "phone") {
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("back", "arrow_back", "back", "back"), title: brand(cfg) }),
    body: { type: "SingleChildScrollView", key: "settings-page", children: [{ type: "Column", padding: { compact: 12, expanded: 24 }, gap: 16, children: [
      ...cfg.hasSettings ? [{ type: "settings", key: "form" }, { type: "Divider", key: "supportDivider" }] : [],
      supportNode(device)
    ] }] }
  };
}
function gateView(cfg, device = "phone") {
  const name = [cfg.name, cfg.nameEn || cfg.name];
  return {
    type: "Scaffold",
    appBar: bar({ leading: iconButton("close", "close", "close", { go: { close: true } }), title: brand(cfg) }),
    body: { type: "Column", key: "gate", mainAxisAlignment: "center", crossAxisAlignment: "center", padding: 24, gap: 16, children: [
      { type: "Text", key: "gateTitle", style: "h3", ...twin("gateTitle") },
      { type: "Text", key: "gateText", style: "p", ...twin("gateText", "text", { name }) },
      { type: "ElevatedButton", key: "installResolver", ...twin("gateInstall", "labelText"), onPressed: { go: { installPlugin: { repo: RESOLVER_REPO } } } },
      supportNode(device)
    ] }
  };
}

// src/std/metaCache.js
var KEY = "meta3";
var MAX = 160;
var CONCURRENCY = 3;
var OVERVIEW_MAX = 160;
var HTTPS2 = /^https:\/\//;
function makeMetaCache({ kino: kino2, titleOf: titleOf2 = (c) => c.title, typeOf = (c) => c.kind === "series" ? "series" : "movie", tmdbPictures = false, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino2.meta === "function" && kino2.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino2.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      kino2.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return {
      ...e.t > 0 ? { tmdb: e.t } : {},
      ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {},
      ...e.p && HTTPS2.test(e.p) ? { poster: e.p } : {},
      ...e.b && HTTPS2.test(e.b) ? { backdrop: e.b } : {},
      ...typeof e.o === "string" && e.o ? { overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const poster = tmdbPictures && k.poster ? k.poster : null;
      if (!k.tmdb && !poster) return c;
      return { ...c, ...k.tmdb && !(c.ids && c.ids.tmdb) ? { ids: { ...c.ids || {}, tmdb: k.tmdb } } : {}, ...poster ? { poster } : {} };
    });
  }
  async function fill2(cards, budgetMs) {
    if (!usable()) return 0;
    const b = read();
    const end = clock.now() + budgetMs;
    let count = 0;
    let stop = false;
    const seen = /* @__PURE__ */ new Set();
    const todo = cards.filter((c) => {
      if (!c || typeof c.id !== "string" || seen.has(c.id) || Object.hasOwn(b, c.id) || c.ids && c.ids.tmdb && c.noLogo) return false;
      seen.add(c.id);
      return true;
    });
    let next = 0;
    const str = (v, max) => typeof v === "string" ? v.slice(0, max) : "";
    const worker = async () => {
      while (!stop && next < todo.length && clock.now() < end) {
        const c = todo[next++];
        const year = c.year !== void 0 ? { year: c.year } : {};
        try {
          const a = await kino2.meta({ type: typeOf(c), title: titleOf2(c), ...year });
          b[c.id] = {
            t: a && a.ids && Number.isInteger(a.ids.tmdb) ? a.ids.tmdb : 0,
            l: str(a && a.logo, 2048),
            p: str(a && a.poster, 2048),
            b: str(a && a.backdrop, 2048),
            o: str(a && a.overview, OVERVIEW_MAX)
          };
          count++;
        } catch (e) {
          if (e && e.code === "rate_limited") stop = true;
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (count > 0) write();
    return count;
  }
  return { known, asked, dress, fill: fill2, usable, tmdbPictures };
}

// src/std/index.js
var TAB_KEY = "browseTab";
var SNAP_PREFIX = "browse1:";
var SNAP_TTL_MS = 7 * 24 * 3600 * 1e3;
var SNAP_MAX = 20 * 1024;
var SNAPS_TOTAL = 96 * 1024;
var RECENT_KEY = "recent1";
var RECENT_MAX = 12;
var Q_MAX = 200;
var META_TICK_MS = 3e3;
var META_TICK_CARDS = 24;
var INFLIGHT_KEY = "std:inflight";
var INFLIGHT_STALE_MS = 18e3;
var MAX_META_TICKS = 10;
var DEFAULT_TABS = [{ id: "inicio", label: "Inicio", labelEn: "Home" }];
function makeStandardScreen({ kino: kino2, name, nameEn, logo = null, logoAspect = "1:1", needsResolver, hasSettings, tabs, loadTab, homeKey = null, titleOf: titleOf2, typeOf, tmdbPictures = false, imageHeaders = null }) {
  const cfg = { name, nameEn, logo, logoAspect, imageHeaders, hasSettings: !!hasSettings, tabs: Array.isArray(tabs) && tabs.length > 0 ? tabs : DEFAULT_TABS };
  const TAB_IDS = cfg.tabs.map((t2) => t2.id);
  const meta = makeMetaCache({ kino: kino2, titleOf: titleOf2, typeOf, tmdbPictures });
  function slidesFromMeta(rails) {
    const out = [];
    for (const r of rails) {
      for (const c of r.items) {
        if (out.length >= MAX_SLIDES) return out;
        const k = meta.known(c.id);
        if (!k.backdrop || c.adult === true || out.some((x) => x.id === c.id)) continue;
        out.push({ id: c.id, ref: c.ref, kind: c.kind, title: c.title, image: k.backdrop, text: slideText(k.overview, c), ...k.logo ? { logo: k.logo } : {} });
      }
    }
    return out;
  }
  const enrich = (data) => {
    if (!data) return data;
    const own = data.slides.map((s) => {
      const k = meta.known(s.id);
      const image = tmdbPictures && k.backdrop ? k.backdrop : null;
      return k.logo || image ? { ...s, ...k.logo ? { logo: k.logo } : {}, ...image ? { image } : {} } : s;
    });
    const learned = own.length > 0 ? [] : slidesFromMeta(data.rails);
    return {
      // The site's own backdrops, else TMDB's, else the posters: every plugin has a hero.
      slides: own.length > 0 ? own : learned.length > 0 ? learned : data.posterSlides || [],
      rails: data.rails.map((r) => ({ ...r, items: meta.dress(r.items) }))
    };
  };
  const metaTicks = /* @__PURE__ */ new Map();
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino2.log("[std]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino2.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino2.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  const snapMax = Math.min(SNAP_MAX, Math.floor(SNAPS_TOTAL / TAB_IDS.length));
  function writeSnap(tab, data) {
    for (let per = 10; per >= 3; per -= 2) {
      const slim = { slides: data.slides, posterSlides: data.posterSlides || [], rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, per) })) };
      const text2 = JSON.stringify({ at: Date.now(), data: slim });
      if (text2.length <= snapMax) {
        set(SNAP_PREFIX + tab, text2, { ttlMs: SNAP_TTL_MS });
        return;
      }
    }
  }
  function homeSeed(tab) {
    if (!homeKey || tab !== TAB_IDS[0]) return null;
    try {
      const o = JSON.parse(get(homeKey) || "null");
      return o && Array.isArray(o.rows) && o.rows.length ? tabOf({ rows: o.rows }) : null;
    } catch (_) {
      return null;
    }
  }
  const stored = () => {
    const t2 = get(TAB_KEY);
    return TAB_IDS.includes(t2) ? t2 : null;
  };
  function dataOf(tab) {
    if (memo.has(tab)) return memo.get(tab).data;
    const snap = readSnap(tab) || homeSeed(tab);
    if (snap) {
      memo.set(tab, { data: snap, whole: false });
      return snap;
    }
    return null;
  }
  const readKeys = () => {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  };
  function notePlayed(ref) {
    try {
      const key = playedKey(ref);
      if (key === "" || key.startsWith("x|")) return;
      const keys = readKeys();
      if (keys[0] === key) return;
      set(RECENT_KEY, JSON.stringify([key, ...keys.filter((k) => k !== key)].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab) {
    return memo.get(tab) && memo.get(tab).whole ? [] : [tab];
  }
  function screen2(ctx) {
    const c = ctx || {};
    const device = c.device || "phone";
    if (needsResolver && !(c.installed && c.installed[RESOLVER_REPO])) return gateView(cfg, device);
    if (c.route && c.route.name === "settings") return settingsView(cfg, device);
    const st = c.state && typeof c.state === "object" ? c.state : {};
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(c.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t2) => memo.get(t2)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    const searching = st.searching === true;
    return browseView(cfg, { tab, data, recent: meta.dress(recentOf(readKeys(), loaded)), pending, failed: !!(st.failed && st.failed[tab]), searching, device });
  }
  function cutShort() {
    try {
      const o = JSON.parse(get(INFLIGHT_KEY) || "null");
      if (!o || typeof o.tab !== "string") return null;
      if (Date.now() - Number(o.at) < INFLIGHT_STALE_MS) return null;
      kino2.storage.remove(INFLIGHT_KEY);
      return o.tab;
    } catch (_) {
      return null;
    }
  }
  async function load(tab) {
    set(INFLIGHT_KEY, JSON.stringify({ tab, at: Date.now() }));
    let page;
    try {
      page = await loadTab(tab);
    } finally {
      try {
        kino2.storage.remove(INFLIGHT_KEY);
      } catch (_) {
      }
    }
    const data = tabOf(page);
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const events = {
    open({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t2 of TAB_IDS) dataOf(t2);
      return { state: { tab, pending: needed(tab), failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      set(TAB_KEY, tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t2) => t2 !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      const queued = Array.isArray(state.pending) ? state.pending.filter((t2) => t2 !== tab) : [];
      return { state: { failed: null, pending: [tab, ...queued] } };
    },
    async tick({ state }) {
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const tab = next.slice(5);
        const m = memo.get(tab);
        if (!m) return { state: { pending: rest } };
        const ask = (x) => ({ id: x.id, title: x.title, kind: x.kind, ...x.year !== void 0 ? { year: x.year } : {} });
        const noOwnSlides = m.data.slides.length === 0;
        const cards = [...m.data.slides.map(ask), ...m.data.rails.flatMap((r) => r.items.slice(0, noOwnSlides ? MAX_SLIDES * 3 : 6).map(ask))].filter((c) => !meta.asked(c.id)).slice(0, META_TICK_CARDS);
        const count = await meta.fill(cards, META_TICK_MS);
        const ticks = (metaTicks.get(tab) || 0) + 1;
        metaTicks.set(tab, ticks);
        const again = noOwnSlides && count > 0 && ticks < MAX_META_TICKS && slidesFromMeta(m.data.rails).length < MAX_SLIDES && cards.some((c) => !meta.asked(c.id));
        return { state: { pending: again ? [next, ...rest] : rest } };
      }
      if (cutShort() === next) {
        log("tab", next, "cut short by Kino last time");
        failed[next] = true;
        return { state: { pending: rest, failed } };
      }
      try {
        const ok = await load(next);
        if (!ok) failed[next] = true;
        else delete failed[next];
        if (ok && meta.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("tab", e && e.code || "error");
        failed[next] = true;
      }
      return { state: { pending: rest, failed } };
    },
    // The words go to Kino's own search, with this plugin as the source; the bar is put back as it was, locally.
    // The search button's own event (after its local ops): while searching, the tree declares onBack, so Back closes the box.
    searchOpened() {
      return { state: { searching: true } };
    },
    // The box was closed (its arrow, or Back through onBack, already ran the local ops): the flag and the ops go, so the next
    // tree declares no onBack and draws the bar's defaults.
    searchClosed() {
      return { state: { searching: false, ui: null } };
    },
    search({ value, state, device }) {
      const typed = value && typeof value === "object" ? value.q : value;
      const raw = typed != null && String(typed).trim() !== "" ? typed : state.inputs && state.inputs.q;
      const q = String(raw == null ? "" : raw).trim().slice(0, Q_MAX);
      if (!q) return null;
      return { go: { search: { q } }, ui: searchClosedOps(device === "tv" && TAB_IDS.length > 1), state: { searching: false, ui: null } };
    },
    openSettings() {
      return { route: { push: "settings" }, state: { fromBrowse: true } };
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { fromBrowse: false } };
    }
  };
  async function screenEvent2(ev) {
    const e = ev || {};
    const name2 = e.name != null ? e.name : e.event;
    const handler = typeof name2 === "string" && Object.hasOwn(events, name2) ? events[name2] : null;
    return handler ? await handler({ ...e, state: e.state || {} }) ?? null : null;
  }
  return { screen: screen2, screenEvent: screenEvent2, notePlayed };
}

// src/logo.js
var LOGO = "data:image/png;base64,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";
var LOGO_ASPECT = "1:1";

// src/resolve-door.js
var HLS_MIME = "application/vnd.apple.mpegurl";
var RESOLVER_ALIAS = "resolver";
var CAPTURE_MS = 2e4;
function headersOf(s) {
  const out = {};
  if (s.referer) out.Referer = s.referer;
  const h = s.headers;
  if (Array.isArray(h)) for (const x of h) {
    if (x && x.name) out[x.name] = String(x.value);
  }
  else if (h && typeof h === "object") for (const [k, v] of Object.entries(h)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}
function pickBest(streams) {
  return streams.find((s) => s && s.url && (s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url))) || streams.find((s) => s && s.url) || null;
}
async function captureStreams(kino2, embedUrl, referer) {
  const b = kino2 && kino2.browser;
  if (!b || typeof b.capture !== "function") return [];
  const opts = { timeoutMs: CAPTURE_MS, match: "\\.m3u8|\\.mp4" };
  if (referer) opts.headers = { Referer: referer };
  let cap;
  try {
    cap = await b.capture(embedUrl, opts);
  } catch (_) {
    return [];
  }
  const out = [];
  for (const m of cap && cap.media || []) {
    if (!m || !m.url) continue;
    out.push({ url: m.url, kind: /\.m3u8(\?|$)/i.test(m.url) ? "hls" : "mp4", server: "browser", headers: m.headers || {} });
  }
  return out;
}
async function resolveViaHelper(embedUrl, kino2, referer, allowCapture = true) {
  let res = null;
  try {
    res = await kino2.plugins.call(RESOLVER_ALIAS, "resolve", { url: embedUrl, referer });
  } catch (err) {
    try {
      kino2.log("[pelispedia]", "resolver", err && err.code || "call_failed");
    } catch (_) {
    }
  }
  let streams = res && Array.isArray(res.streams) ? res.streams.slice() : [];
  const subtitles = res && Array.isArray(res.subtitles) ? res.subtitles.filter((x) => x && x.lang && x.url) : [];
  let captured = false;
  const dead = !streams.length && res && res.error === "dead";
  if (!streams.length && !dead && (typeof allowCapture === "function" ? allowCapture() : allowCapture)) {
    streams = await captureStreams(kino2, embedUrl, referer);
    captured = streams.length > 0;
  }
  const s = pickBest(streams);
  if (!s) return null;
  const headers = headersOf(s);
  const isHls = s.kind === "hls" || /\.m3u8(\?|$)/i.test(s.url);
  return {
    url: s.url,
    mime: isHls ? HLS_MIME : /\.mp4(\?|$)/i.test(s.url) ? "video/mp4" : void 0,
    ...Object.keys(headers).length ? { headers } : {},
    ...captured ? { captured: true } : {},
    ...subtitles.length ? { subtitles } : {}
  };
}
async function resolverInstalled(kino2) {
  try {
    await kino2.plugins.call(RESOLVER_ALIAS, "normalizeHost", { url: "https://probe.invalid/" });
    return true;
  } catch (err) {
    return (err && err.code) !== "provider_missing";
  }
}

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

// src/util/home.js
var BUDGET_MS = 11e3;
var KEEP_MS = 12 * 60 * 60 * 1e3;
var MAX_CHARS = 60 * 1024;
function keep(key, rows) {
  try {
    for (let per = 20; per >= 4; per -= 4) {
      const text2 = JSON.stringify({ at: Date.now(), rows: rows.map((r) => ({ ...r, items: Array.isArray(r.items) ? r.items.slice(0, per) : r.items })) });
      if (text2.length <= MAX_CHARS) {
        kino.storage.set(key, text2, { ttlMs: KEEP_MS });
        return;
      }
    }
  } catch (_) {
  }
}
function kept(key) {
  try {
    const o = JSON.parse(kino.storage.get(key) || "null");
    return o && Date.now() - o.at < KEEP_MS && Array.isArray(o.rows) && o.rows.length ? o.rows : null;
  } catch (_) {
    return null;
  }
}
async function homeWithin(jobs, { key = "home:last", budgetMs = BUDGET_MS } = {}) {
  const out = jobs.map(() => null);
  let done = false;
  const all = Promise.all(jobs.map((job, i) => Promise.resolve().then(job).then((row) => {
    out[i] = row;
  }, () => {
  }))).then(() => {
    done = true;
  });
  const end = Date.now() + budgetMs;
  while (!done && Date.now() < end) await Promise.race([all, kino.sleep(Math.min(250, Math.max(1, end - Date.now())))]);
  const rows = out.filter(Boolean);
  if (rows.length) {
    keep(key, rows);
    return rows;
  }
  return kept(key) || [];
}

// src/plugin.js
globalThis.__kinoDropPendingFetches = true;
var CACHE_MS = 10 * 60 * 1e3;
var RESOLVE_MS = 4e4;
var MAX_CAPTURES = 1;
var CAPTURE_PAGE_MS = 23e3;
function takeCapture(budget) {
  if (!budget || budget.captures <= 0 || budget.deadline - Date.now() < CAPTURE_PAGE_MS) return false;
  budget.captures -= 1;
  return true;
}
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
    cacheCleared: "Cach\xE9 vaciada.",
    needResolver: "Para reproducir, abre Pelispedia desde el men\xFA e instala el motor de reproducci\xF3n que te pedir\xE1."
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
    cacheCleared: "Cache cleared.",
    needResolver: "To play, open Pelispedia from the menu and install the playback engine it asks for."
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
  return homeWithin([
    () => safeRow("peliculas", () => rowOf("peliculas", "list:peliculas")),
    () => safeRow("series", () => rowOf("series", "list:series")),
    () => safeRow("accion", () => rowOf("accion", "genre:accion", "accion")),
    () => safeRow("terror", () => rowOf("terror", "genre:terror", "terror")),
    () => safeRow("comedia", () => rowOf("comedia", "genre:comedia", "comedia"))
  ]);
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
      if (embed) out.push({ ...o, embed, host: new URL(embed).hostname, _lt: rank(o) });
    } catch (_) {
    }
  }
  return out;
}
var STATS_KEY = "srvStats";
var STATS_CAP = 24;
function readStats() {
  try {
    const o = JSON.parse(kino.storage.get(STATS_KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch (_) {
    return {};
  }
}
function scoreOf(id, stats) {
  const s = stats[id] || { ok: 0, fail: 0 };
  return (s.ok + 1) / (s.ok + s.fail + 2);
}
function noteServer(id, ok) {
  try {
    const stats = readStats();
    const s = stats[id] || { ok: 0, fail: 0 };
    s[ok ? "ok" : "fail"] += 1;
    if (s.ok + s.fail > STATS_CAP) {
      s.ok = Math.round(s.ok / 2);
      s.fail = Math.round(s.fail / 2);
    }
    stats[id] = s;
    kino.storage.set(STATS_KEY, JSON.stringify(stats));
  } catch (_) {
  }
}
async function resolve(ref) {
  const m = /^c:(.+)@(\d+)$/.exec(String(ref || ""));
  const base = m ? m[1] : String(ref || "");
  const only = m ? Number(m[2]) : null;
  const pageUrl = pageOf(base);
  if (!pageUrl) throw kino.error("not_found", "unknown ref: " + ref);
  if (!await resolverInstalled(kino)) throw kino.error("unavailable", "resolver missing", { userMessage: t("needResolver") });
  const req = makeReq(kino, { deadline: Date.now() + RESOLVE_MS });
  const budget = { captures: MAX_CAPTURES, deadline: Date.now() + RESOLVE_MS };
  const options = await optionsOf(pageUrl, req);
  if (!options.length) throw kino.error("not_found", "no options on " + pageUrl, { userMessage: t("noStreams") });
  const stats = readStats();
  const order = only != null ? [only] : options.map((_, k) => k).sort((a, b) => options[a]._lt - options[b]._lt || scoreOf(options[b].host, stats) - scoreOf(options[a].host, stats) || a - b);
  const failures = [];
  for (const i of order) {
    const o = options[i];
    if (!o) continue;
    try {
      const out = await resolveViaHelper(o.embed, kino, SITE + "/", () => takeCapture(budget));
      if (!out) {
        failures.push(`${o.host}: no stream`);
        noteServer(o.host, false);
        continue;
      }
      noteServer(o.host, true);
      const stream = { url: out.url, mime: out.mime, headers: { "User-Agent": UA, ...out.headers || {} }, label: labelOf(o) };
      if (out.subtitles) stream.subtitles = out.subtitles;
      if (out.durationMs) stream.durationMs = out.durationMs;
      if (only == null) {
        const others = options.map((_, j) => j).filter((j) => j !== i);
        if (others.length) stream.alternatives = others.map((j) => ({ ref: `c:${base}@${j}`, label: labelOf(options[j]) }));
        try {
          standard().notePlayed(base);
        } catch (_) {
        }
      }
      return stream;
    } catch (e) {
      failures.push(`${o.host}: ${e && e.code || ""} ${e && e.message || e}`.trim());
      noteServer(o.host, false);
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
var std = null;
var standard = () => std ?? (std = makeStandardScreen({
  kino,
  name: "Pelispedia",
  logo: LOGO,
  logoAspect: LOGO_ASPECT,
  needsResolver: true,
  hasSettings: true,
  tabs: [
    { id: "novedades", label: "Novedades", labelEn: "What's new" },
    { id: "peliculas", label: "Pel\xEDculas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "generos", label: "G\xE9neros", labelEn: "Genres" }
  ],
  loadTab: async (tabId) => ({ rows: (await section({ tab: tabId })).rows })
}));
async function screen(ctx) {
  await null;
  return standard().screen(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return standard().screenEvent(ev && typeof ev === "object" ? ev : {});
}
export {
  action,
  browse,
  categories,
  details,
  episodes,
  home,
  resolve,
  screen,
  screenEvent,
  search,
  section,
  settingsStatus
};
