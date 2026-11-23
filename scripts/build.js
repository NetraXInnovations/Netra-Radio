'use strict';

// Builds the JSON files the Netra Plus app reads for Netra Radio.
// (eBooks and Audio Books are not stored here: the app asks Internet Archive directly.)
// No server: GitHub Actions runs this every day for free and commits the files; the app reads
// them through jsDelivr (or GitHub raw). Run by hand with:  node scripts/build.js
//
// Output (all under data/):
//   catalog.json                      languages, categories, on/off switches, news languages
//   radio/<language>/<category>.json  first 40 stations   { stations, offset, hasMore }
//
// A list that cannot be fetched today keeps yesterday's file, so a provider outage never empties the app.

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog');
const src = require('./sources');

const ROOT = path.join(__dirname, '..', 'data');
const SETTINGS = path.join(__dirname, '..', 'settings.json');
const PARALLEL = 3;

function write(file, value) {
  const full = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value) + '\n');
}

/** settings.json: hand-edited switches and list overrides (optional). */
function settings() {
  const s = fs.existsSync(SETTINGS) ? JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) : {};
  return {
    version: Number(s.version) || 1,
    ebooksEnabled: s.ebooksEnabled !== false,
    radioEnabled: s.radioEnabled !== false,
    audioEnabled: s.audioEnabled !== false,
    newsEnabled: s.newsEnabled !== false,
    languages: Array.isArray(s.languages) && s.languages.length ? s.languages : catalog.LANGUAGES,
    bookCategories: Array.isArray(s.bookCategories) && s.bookCategories.length ? s.bookCategories : catalog.BOOK_CATEGORIES,
    radioCategories: Array.isArray(s.radioCategories) && s.radioCategories.length ? s.radioCategories : catalog.RADIO_CATEGORIES,
    audioCategories: Array.isArray(s.audioCategories) && s.audioCategories.length ? s.audioCategories : catalog.AUDIO_CATEGORIES,
  };
}

async function retry(fn, times = 3) {
  let last;
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  throw last;
}

async function runAll(jobs) {
  let next = 0; let ok = 0; let failed = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        write(job.file, await retry(job.load));
        ok++;
      } catch (e) {
        failed++;
        console.warn('kept old file', job.file, String(e.message || e));
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return { ok, failed };
}

async function main() {
  const s = settings();
  // The full catalog, query details included: the app searches Internet Archive and Radio Browser
  // itself with these, so categories and languages change here without an app update.
  write('catalog.json', {
    version: s.version,
    updatedAt: new Date().toISOString(),
    ebooksEnabled: s.ebooksEnabled,
    radioEnabled: s.radioEnabled,
    audioEnabled: s.audioEnabled,
    newsEnabled: s.newsEnabled,
    languages: s.languages,
    bookCategories: s.bookCategories,
    radioCategories: s.radioCategories,
    audioCategories: s.audioCategories,
    news: catalog.publicCatalog(s).news,
  });

  const jobs = [];
  for (const language of s.languages) {
    if (s.radioEnabled) for (const category of s.radioCategories) {
      jobs.push({ file: `radio/${language.id}/${category.id}.json`, load: () => src.radioStations({ language, category, query: '', offset: 0 }) });
    }
  }
  const { ok, failed } = await runAll(jobs);
  console.log(`Done: ${ok} lists written, ${failed} kept from before.`);
  if (ok === 0 && jobs.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
