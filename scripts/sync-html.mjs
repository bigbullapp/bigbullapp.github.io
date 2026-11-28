#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CATEGORY_LABELS = {
  all: "Tümü",
  dizi: "Dizi",
  film: "Film",
  anime: "Anime",
  asya: "Asya",
  cizgi: "Çizgi ve Çocuk",
  tv: "Ulusal TV",
  belgesel: "Belgesel",
  canli: "Canlı TV"
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceTagTextById(html, id, newText) {
  const re = new RegExp(`(<[a-z0-9]+\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>)([\\s\\S]*?)(<\\/[a-z0-9]+>)`, "i");
  if (!re.test(html)) {
    throw new Error(`Missing element #${id} in index.html`);
  }
  return html.replace(re, `$1${newText}$3`);
}

export function computeHtmlSync(html, data) {
  if (!data || !Array.isArray(data.providers)) {
    throw new Error("Invalid providers.json payload");
  }

  const providers = data.providers;
  const stats = data.stats || {};
  const total = providers.length;
  const passive = typeof stats.passive === "number"
    ? stats.passive
    : providers.filter((p) => Boolean(p.passive)).length;
  const active = total - passive;
  const csCount = typeof stats.cloudstream === "number"
    ? stats.cloudstream
    : providers.filter((p) => Boolean(p.cloudstream)).length;
  const csActive = providers.filter((p) => Boolean(p.cloudstream && !p.passive)).length;
  const nuvioActive = typeof stats.nuvioActive === "number"
    ? stats.nuvioActive
    : providers.filter((p) => Boolean((p.nuvio || p.nuvioAddon) && !p.passive)).length;
  const liveChannels = typeof stats.liveChannels === "number" ? stats.liveChannels : 0;
  const pct = total ? Math.round((active / total) * 100) : 0;
  const version = typeof data.version === "string" && data.version.trim()
    ? data.version.trim()
    : "0.0.0";

  let out = html;

  // Meta description counts
  const metaDescRe = /(<meta\s+name="description"\s+content=")([^"]*)(")/i;
  if (!metaDescRe.test(out)) {
    throw new Error("Missing meta description in index.html");
  }
  out = out.replace(
    metaDescRe,
    `$1Cloudstream ve Nuvio için Türkçe dizi, film, anime ve canlı TV eklenti deposu. ${csCount} modül, ${nuvioActive} eklenti ve ${liveChannels} canlı TV kanalı.$3`
  );

  // Versions & hero/stats readouts
  out = replaceTagTextById(out, "repo-version", `v${version}`);
  out = replaceTagTextById(out, "footer-version", `v${version}`);
  out = replaceTagTextById(out, "stat-cs", String(csCount));
  out = replaceTagTextById(out, "stat-nuvio", String(nuvioActive));
  out = replaceTagTextById(out, "stat-channels", String(liveChannels));
  out = replaceTagTextById(out, "provider-count", `${total} sağlayıcı`);
  out = replaceTagTextById(out, "chart-active-pct", `%${pct}`);
  out = replaceTagTextById(out, "chart-total", String(total));
  out = replaceTagTextById(out, "chart-active", String(active));
  out = replaceTagTextById(out, "chart-passive", String(passive));
  out = replaceTagTextById(out, "bar-cs-val", `${csActive} / ${total}`);
  out = replaceTagTextById(out, "bar-nuvio-val", `${nuvioActive} / ${total}`);
  out = replaceTagTextById(out, "bar-passive-val", `${passive} / ${total}`);
  out = replaceTagTextById(
    out,
    "stats-chart-caption",
    `Toplam ${total} sağlayıcıdan ${active} tanesi aktif, ${passive} tanesi pasif.`
  );

  // Category filter pill counts
  for (const [catId, label] of Object.entries(CATEGORY_LABELS)) {
    const count = catId === "all"
      ? total
      : providers.filter((p) => {
          const tags = Array.isArray(p.tags) ? p.tags : [];
          return tags.includes(catId) || p.category === catId;
        }).length;
    const pillRe = new RegExp(
      `(<button\\b[^>]*\\bdata-cat="${escapeRegExp(catId)}"[^>]*>)([^<]*)(<\\/button>)`,
      "i"
    );
    if (pillRe.test(out)) {
      out = out.replace(pillRe, `$1${label} (${count})$3`);
    }
  }

  return out;
}

export function syncHtml({ checkOnly = false, root = path.resolve(import.meta.dirname, "..") } = {}) {
  const providersPath = path.join(root, "data", "providers.json");
  const indexPath = path.join(root, "index.html");
  const data = JSON.parse(fs.readFileSync(providersPath, "utf8"));
  const currentHtml = fs.readFileSync(indexPath, "utf8");
  const nextHtml = computeHtmlSync(currentHtml, data);
  const changed = nextHtml !== currentHtml;

  if (!checkOnly && changed) {
    fs.writeFileSync(indexPath, nextHtml, "utf8");
  }

  return {
    changed,
    version: data.version,
    cloudstream: data.stats?.cloudstream,
    nuvioActive: data.stats?.nuvioActive,
    liveChannels: data.stats?.liveChannels
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const checkOnly = process.argv.includes("--check");
  const res = syncHtml({ checkOnly });
  if (checkOnly && res.changed) {
    console.error("ERROR: index.html is out of sync with data/providers.json. Run: node scripts/sync-html.mjs");
    process.exit(1);
  }
  const verb = checkOnly ? "OK (in sync)" : (res.changed ? "UPDATED" : "OK (unchanged)");
  console.log(`${verb}: v${res.version} (${res.cloudstream} CS, ${res.nuvioActive} Nuvio, ${res.liveChannels} channels)`);
}
