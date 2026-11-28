import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { compileBadgePattern } from "../badges/compile-badge-regex.mjs";
import { computeHtmlSync, syncHtml } from "../scripts/sync-html.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readUtf8(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function readPngInfo(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.ok(buf.length >= 24, `PNG too small: ${filePath}`);
  assert.ok(buf.subarray(0, 8).equals(PNG_MAGIC), `Invalid PNG signature: ${filePath}`);
  assert.equal(buf.subarray(12, 16).toString("ascii"), "IHDR", `Missing IHDR: ${filePath}`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.length,
    sha256: crypto.createHash("sha256").update(buf).digest("hex")
  };
}

test("data/stats.json is removed and unreferenced", () => {
  assert.equal(fs.existsSync(path.join(ROOT, "data", "stats.json")), false);
  for (const rel of ["index.html", "app.js", "styles.css", "README.md", "DESIGN.md"]) {
    assert.equal(readUtf8(rel).includes("stats.json"), false, `${rel} must not reference stats.json`);
  }
});

test("providers.json counts, schema, and icons are valid and consistent", () => {
  const data = JSON.parse(readUtf8("data/providers.json"));
  assert.equal(typeof data.version, "string");
  assert.ok(Array.isArray(data.providers) && data.providers.length > 0);

  const total = data.providers.length;
  const csCount = data.providers.filter((p) => p.cloudstream).length;
  const passiveCount = data.providers.filter((p) => p.passive).length;
  const nuvioCount = data.providers.filter((p) => (p.nuvio || p.nuvioAddon) && !p.passive).length;

  assert.equal(data.stats.cloudstream, csCount);
  assert.equal(data.stats.passive, passiveCount);
  assert.ok(data.stats.nuvioTotal >= nuvioCount, `nuvioTotal (${data.stats.nuvioTotal}) < active provider nuvioCount (${nuvioCount})`);
  assert.ok(data.stats.nuvioActive >= nuvioCount && data.stats.nuvioActive <= data.stats.nuvioTotal, `nuvioActive (${data.stats.nuvioActive}) out of range [${nuvioCount}, ${data.stats.nuvioTotal}]`);
  assert.equal(data.stats.liveChannels, 184);

  const safeIconRe = /^assets\/(?:icons\/[a-z0-9._-]+\.(?:png|webp)|brand-mark\.webp)$/i;
  for (const p of data.providers) {
    assert.equal(typeof p.name, "string");
    assert.ok(p.name.trim().length > 0);
    assert.match(p.icon, safeIconRe, `Unsafe icon path for ${p.name}: ${p.icon}`);
    assert.equal(fs.existsSync(path.join(ROOT, p.icon)), true, `Missing icon file: ${p.icon}`);
  }
});

test("index.html matches providers.json counts, security headers, SEO, and a11y", () => {
  const data = JSON.parse(readUtf8("data/providers.json"));
  const html = readUtf8("index.html");

  // Version & stat parity
  assert.match(html, new RegExp(`id="repo-version">v${data.version.replaceAll(".", "\\.")}<`));
  assert.match(html, new RegExp(`id="footer-version">v${data.version.replaceAll(".", "\\.")}<`));
  assert.match(html, new RegExp(`id="stat-cs">${data.stats.cloudstream}<`));
  assert.match(html, new RegExp(`id="stat-nuvio">${data.stats.nuvioActive}<`));
  assert.match(html, new RegExp(`id="stat-channels">${data.stats.liveChannels}<`));
  assert.match(html, new RegExp(`id="bar-nuvio-val">${data.stats.nuvioActive} / ${data.providers.length}<`));
  assert.ok(html.includes(`${data.stats.liveChannels} canlı TV kanalı`));

  // Security: strict CSP with SHA-256 hashes, Referrer-Policy, no inline styles
  const cspMatch = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(html);
  assert.ok(cspMatch, "Missing Content-Security-Policy meta tag");
  const csp = cspMatch[1];
  assert.equal(csp.includes("'unsafe-inline'"), false, "CSP must not use unsafe-inline");
  assert.match(html, /<meta\s+name="referrer"\s+content="strict-origin-when-cross-origin">/i);
  assert.equal(/\sstyle="/i.test(html), false, "index.html must not contain inline style attributes");

  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(inlineScripts.length, 2);
  for (const scriptBody of inlineScripts) {
    const normalized = scriptBody.replace(/\r\n?/g, "\n");
    const hash = "sha256-" + crypto.createHash("sha256").update(normalized, "utf8").digest("base64");
    assert.ok(csp.includes(`'${hash}'`), `CSP missing hash '${hash}' for inline script`);
  }

  // SEO & preloads
  assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/bigbullapp\.github\.io\/">/i);
  assert.match(html, /<meta\s+property="og:image"\s+content="https:\/\/bigbullapp\.github\.io\/assets\/logo\.png">/i);
  assert.match(html, /<meta\s+name="twitter:card"\s+content="summary">/i);
  assert.match(html, /<meta\s+name="theme-color"\s+content="#070B18">/i);
  assert.match(html, /<link\s+rel="preload"\s+href="data\/providers\.json"\s+as="fetch"\s+crossorigin>/i);

  // Hero 680w fix & no hardcoded dark src on #hero-bg-img (prevents light theme double fetch)
  assert.ok(html.includes("bg-mascot-dark-800.webp 680w"));
  assert.ok(html.includes("bg-mascot-light-800.webp 680w"));
  assert.equal(html.includes("800w"), false);
  const heroTag = /<img\b[^>]*\bid="hero-bg-img"[^>]*>/.exec(html);
  assert.ok(heroTag);
  assert.equal(/(?:^|\s)src=/.test(heroTag[0]), false, "#hero-bg-img must not hardcode src before theme script");

  // Accessibility: no aria-live on .providers-stage; role=status/alert on state boxes
  assert.match(html, /<div class="providers-stage">/);
  assert.match(html, /id="state-empty"[^>]*role="status"/);
  assert.match(html, /id="state-error"[^>]*role="alert"/);

  // robots.txt & sitemap.xml
  const robots = readUtf8("robots.txt");
  assert.ok(robots.includes("Sitemap: https://bigbullapp.github.io/sitemap.xml"));
  const sitemap = readUtf8("sitemap.xml");
  assert.ok(sitemap.includes("<loc>https://bigbullapp.github.io/</loc>"));
});

test("badges/bigbull-badges.json regexes compile in JS RegExp and handle Turkish & tvplus guards", () => {
  const badges = JSON.parse(readUtf8("badges/bigbull-badges.json"));
  assert.equal(badges.filters.length, 78);

  const byId = new Map();
  for (const f of badges.filters) {
    const rxCompat = compileBadgePattern(f.pattern);
    assert.ok(rxCompat instanceof RegExp);
    byId.set(f.id, rxCompat);

    const relIcon = f.imageURL.replace("https://bigbullapp.github.io/", "").split("?")[0];
    assert.equal(fs.existsSync(path.join(ROOT, relIcon)), true, `Missing badge icon: ${relIcon}`);
  }

  assert.equal(byId.get("tvplus").test("TV+ 1080p"), true);
  assert.equal(byId.get("tvplus").test("TVPlus WEB-DL"), true);
  assert.equal(byId.get("tvplus").test("Apple TV+ 4K"), false);
  assert.equal(byId.get("tvplus").test("Apple.TV+.1080p"), false);
  assert.equal(byId.get("tvplus").test("Apple-TV+"), false);
  assert.equal(byId.get("apple-tv").test("Apple TV+ 4K"), true);

  assert.equal(byId.get("dual-audio").test("Çift Sesli 1080p"), true);
  assert.equal(byId.get("dual-audio").test("çift ses 720p"), true);
  assert.equal(byId.get("multi-sub").test("Çoklu Altyazı 1080p"), true);
  assert.equal(byId.get("tr-sub").test("TR Altyazı 1080p"), true);
  assert.equal(byId.get("tr-sub").test("Altyazılı 1080p"), true);
  assert.equal(byId.get("tr-sub").test("Çoklu Altyazı 1080p"), false);
  assert.equal(byId.get("tr-turkish").test("TR Altyazı 1080p"), true);
  assert.equal(byId.get("tr-turkish").test("Türkçe Dublaj"), true);
});

test("all PNG assets are valid, 88x88 icons are normalized, and tv-logos has no duplicates", () => {
  const iconsDir = path.join(ROOT, "assets", "icons");
  for (const file of fs.readdirSync(iconsDir)) {
    const info = readPngInfo(path.join(iconsDir, file));
    assert.equal(info.width, 88, `${file} width expected 88, got ${info.width}`);
    assert.equal(info.height, 88, `${file} height expected 88, got ${info.height}`);
  }

  const tvDir = path.join(ROOT, "assets", "tv-logos");
  const seenHashes = new Map();
  for (const file of fs.readdirSync(tvDir)) {
    const info = readPngInfo(path.join(tvDir, file));
    assert.equal(seenHashes.has(info.sha256), false, `Duplicate tv-logo: ${file} === ${seenHashes.get(info.sha256)}`);
    seenHashes.set(info.sha256, file);
  }

  const badgesDir = path.join(ROOT, "badges", "icons");
  for (const file of fs.readdirSync(badgesDir)) {
    readPngInfo(path.join(badgesDir, file));
  }

  const logoInfo = readPngInfo(path.join(ROOT, "assets", "logo.png"));
  assert.ok(logoInfo.bytes < 60_000, `assets/logo.png should be optimized (<60KB), got ${logoInfo.bytes}`);
});

test("styles.css removes dead CSS/backdrop-filter and fixes layout/font rules", () => {
  const css = readUtf8("styles.css");
  assert.equal(css.includes("@keyframes hero-rise"), false);
  assert.equal(css.includes("@keyframes panel-rise"), false);
  assert.equal(css.includes("light-dark("), false);
  assert.equal(css.includes("--radius-lg"), false);
  assert.equal(css.includes("--dur-slow"), false);
  assert.equal(css.includes("@container stats-chart"), false);
  assert.equal(css.includes("-76px"), false);
  assert.ok(css.includes("U+2191-2193"));
  assert.match(css, /\.field-group\s*\{[^}]*min-inline-size:\s*0;/);
  assert.match(css, /\.mobile-menu-btn\s*\{[^}]*justify-content:\s*center;/);
  assert.match(css, /\.provider-card\s*\{[^}]*grid-template-rows:\s*1fr auto;/);
  const cardBlock = /\.provider-card\s*\{[\s\S]*?\}/.exec(css)[0];
  assert.equal(cardBlock.includes("backdrop-filter"), false);
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
});

function createDomEnv(searchQuery, providersPayload) {
  const elements = new Map();
  const listeners = new Map();

  function makeEl(id, tagName = "div") {
    const attrs = new Map();
    const classes = new Set();
    const el = {
      id,
      tagName: tagName.toUpperCase(),
      hidden: false,
      textContent: "",
      value: "",
      tabIndex: 0,
      children: [],
      parentNode: null,
      style: {},
      className: "",
      focused: false,
      classList: {
        add(c) { classes.add(c); },
        remove(c) { classes.delete(c); },
        toggle(c, force) {
          if (force === undefined) {
            if (classes.has(c)) classes.delete(c); else classes.add(c);
          } else if (force) classes.add(c); else classes.delete(c);
        },
        contains(c) { return classes.has(c); }
      },
      setAttribute(k, v) { attrs.set(k, String(v)); if (k === "class") el.className = String(v); },
      getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
      addEventListener(type, fn) {
        if (!listeners.has(el)) listeners.set(el, {});
        (listeners.get(el)[type] ||= []).push(fn);
      },
      dispatch(type, event = {}) {
        const list = (listeners.get(el) || {})[type] || [];
        for (const fn of list) fn({ target: el, preventDefault() {}, ...event });
      },
      appendChild(child) {
        if (child && child._isFrag) {
          for (const c of child.children) {
            c.parentNode = el;
            el.children.push(c);
          }
          child.children = [];
          return child;
        }
        child.parentNode = el;
        el.children.push(child);
        return child;
      },
      replaceChild(newChild, oldChild) {
        const idx = el.children.indexOf(oldChild);
        if (idx !== -1) el.children[idx] = newChild;
      },
      removeChild(child) {
        const idx = el.children.indexOf(child);
        if (idx !== -1) el.children.splice(idx, 1);
      },
      querySelector(sel) {
        if (sel === ".copy-label") return null;
        if (sel === "svg") return null;
        return null;
      },
      querySelectorAll(sel) {
        if (sel === '[role="tab"]') return [elements.get("tab-cs"), elements.get("tab-nuvio")];
        if (sel === ".cat-pill") return [];
        return [];
      },
      closest() { return null; },
      focus() { el.focused = true; documentRef.activeElement = el; },
      select() {},
      scrollIntoView() {}
    };
    Object.defineProperty(el, "textContent", {
      get() { return el._text || ""; },
      set(v) {
        el._text = String(v);
        if (v === "") el.children = [];
      }
    });
    if (id) elements.set(id, el);
    return el;
  }

  for (const id of [
    "theme-toggle", "hero-bg-img", "mobile-menu-btn", "mobile-nav",
    "repo-version", "footer-version", "stat-cs", "stat-nuvio", "stat-channels",
    "donut-active-arc", "donut-passive-arc", "chart-active-pct", "chart-total",
    "chart-active", "chart-passive", "bar-cs-val", "bar-cs-fill",
    "bar-nuvio-val", "bar-nuvio-fill", "bar-passive-val", "bar-passive-fill",
    "stats-chart-caption", "panel-cs", "panel-nuvio", "tab-cs", "tab-nuvio",
    "install-cta-banner", "install-cta-text", "install-cta-link", "install-cta-dismiss",
    "copy-announcer", "provider-search", "clear-search-btn", "platform-select",
    "category-filters", "provider-count", "state-loading", "state-empty",
    "state-error", "reset-filters-btn", "retry-load-btn", "provider-grid",
    "load-more-bar", "load-more-btn", "show-all-btn", "kurulum"
  ]) {
    makeEl(id);
  }
  elements.get("tab-cs").setAttribute("aria-controls", "panel-cs");
  elements.get("tab-nuvio").setAttribute("aria-controls", "panel-nuvio");
  elements.get("install-cta-banner").hidden = true;
  const themeColorMeta = makeEl("", "meta");

  let hrefAssigned = null;
  let fetchArgs = null;
  const docListeners = {};

  const documentRef = {
    documentElement: makeEl("html", "html"),
    activeElement: null,
    readyState: "interactive",
    getElementById(id) { return elements.get(id) || null; },
    querySelector(sel) {
      if (sel === 'meta[name="theme-color"]') return themeColorMeta;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[role="tab"]') return [elements.get("tab-cs"), elements.get("tab-nuvio")];
      return [];
    },
    createElement(tag) { return makeEl("", tag); },
    createElementNS(_ns, tag) { return makeEl("", tag); },
    createDocumentFragment() { return { _isFrag: true, children: [], appendChild(c) { this.children.push(c); } }; },
    body: makeEl("body", "body"),
    addEventListener(t, fn) { (docListeners[t] ||= []).push(fn); }
  };

  const windowRef = {
    location: {
      search: searchQuery,
      pathname: "/",
      get href() { return hrefAssigned; },
      set href(v) { hrefAssigned = v; }
    },
    history: { replaceState() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    addEventListener() { throw new Error("Must not wait for window load"); }
  };

  const sandbox = {
    window: windowRef,
    document: documentRef,
    navigator: {},
    localStorage: { getItem: () => "dark", setItem() {} },
    URLSearchParams,
    fetch: async (url, init) => {
      fetchArgs = { url, init };
      return {
        ok: true,
        status: 200,
        json: async () => providersPayload
      };
    },
    setTimeout,
    clearTimeout
  };
  sandbox.window.document = documentRef;

  vm.runInNewContext(readUtf8("app.js"), sandbox);
  return {
    elements,
    documentRef,
    getHrefAssigned: () => hrefAssigned,
    getFetchArgs: () => fetchArgs
  };
}

test("app.js blocks ?install=toString prototype hijack and shows CTA banner for valid ?install", async () => {
  const payload = JSON.parse(readUtf8("data/providers.json"));

  const protoEnv = createDomEnv("?install=toString", payload);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(protoEnv.getHrefAssigned(), null);
  assert.equal(protoEnv.elements.get("install-cta-banner").hidden, true);

  const validEnv = createDomEnv("?install=cloudstream", payload);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(validEnv.getHrefAssigned(), null);
  assert.equal(validEnv.elements.get("install-cta-banner").hidden, false);
  assert.equal(
    validEnv.elements.get("install-cta-link").getAttribute("href"),
    "cloudstreamrepo://repo.bigbullapp.com/repo.json"
  );
  assert.equal(validEnv.getFetchArgs().url, "data/providers.json");
  assert.equal(validEnv.getFetchArgs().init, undefined);

  // E2 custom domain consistency: no stale *.applio.workers.dev URLs
  for (const rel of ["index.html", "app.js"]) {
    assert.equal(readUtf8(rel).includes("applio.workers.dev"), false, `${rel} must use bigbullapp.com custom domains`);
  }
  assert.ok(readUtf8("index.html").includes("https://repo.bigbullapp.com/repo.json"));
  assert.ok(readUtf8("index.html").includes("https://katalog.bigbullapp.com/manifest.json"));
  assert.ok(readUtf8("index.html").includes("https://katalog.bigbullapp.com/live/manifest.json"));
});

test("scripts/sync-html.mjs keeps index.html in sync and updates stale counts/versions", () => {
  const status = syncHtml({ checkOnly: true });
  assert.equal(status.changed, false);

  const html = readUtf8("index.html");
  const mockData = {
    version: "9.9.9",
    stats: { cloudstream: 200, passive: 1, nuvioTotal: 195, nuvioActive: 195, liveChannels: 321 },
    providers: Array.from({ length: 200 }, (_, i) => ({
      name: `P${i}`,
      category: "dizi",
      tags: ["dizi"],
      cloudstream: true,
      passive: i === 0,
      nuvio: i < 195,
      nuvioAddon: false
    }))
  };
  const synced = computeHtmlSync(html, mockData);
  assert.ok(synced.includes('id="repo-version">v9.9.9<'));
  assert.ok(synced.includes('id="footer-version">v9.9.9<'));
  assert.ok(synced.includes("200 modül, 195 eklenti ve 321 canlı TV kanalı."));
  assert.ok(synced.includes('id="stat-cs">200<'));
  assert.ok(synced.includes('id="stat-nuvio">195<'));
  assert.ok(synced.includes('id="stat-channels">321<'));
  assert.ok(synced.includes('id="bar-nuvio-val">195 / 200<'));
  assert.ok(synced.includes('data-cat="all" aria-pressed="true">Tümü (200)<'));
  assert.ok(synced.includes('data-cat="dizi" aria-pressed="false">Dizi (200)<'));
});

test("app.js sanitizes icons, computes 138/141 Nuvio, debounces search, appends on Show All, and preserves focus", async () => {
  const baseData = JSON.parse(readUtf8("data/providers.json"));
  const testData = {
    version: baseData.version,
    stats: baseData.stats,
    providers: [
      { name: null, type: "Dizi", category: "dizi", tags: ["dizi"], icon: "https://evil.com/leak.png", cloudstream: true, passive: false, nuvio: true, nuvioAddon: false },
      ...baseData.providers.slice(0, 24)
    ]
  };

  const env = createDomEnv("", testData);
  await new Promise((r) => setTimeout(r, 20));

  const grid = env.elements.get("provider-grid");
  assert.equal(grid.children.length, 18);
  const firstCardImg = grid.children[0].children[0].children[0];
  assert.equal(firstCardImg.src, "assets/brand-mark.webp");

  const fullEnv = createDomEnv("", baseData);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(fullEnv.elements.get("bar-nuvio-val").textContent, "138 / 141");

  const sentinelNode = grid.children[0];
  env.elements.get("show-all-btn").dispatch("click");
  assert.equal(grid.children.length, 25);
  assert.equal(grid.children[0], sentinelNode, "Show All must append incrementally without wiping existing DOM nodes");
  assert.equal(env.elements.get("load-more-bar").hidden, true);
  assert.equal(env.documentRef.activeElement, grid.children[18], "Focus must move to first newly appended card");

  // Search debounce (~120ms) & Turkish case folding ("İ" -> "i")
  const searchInput = fullEnv.elements.get("provider-search");
  searchInput.value = "İZLE";
  searchInput.dispatch("input");
  assert.equal(fullEnv.elements.get("clear-search-btn").hidden, false);
  await new Promise((r) => setTimeout(r, 180));
  assert.ok(fullEnv.elements.get("provider-grid").children.length >= 1);
  assert.notEqual(fullEnv.elements.get("provider-count").textContent, "142 sağlayıcı");
});
