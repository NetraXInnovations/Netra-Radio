'use strict';

// Calls to Internet Archive (books) and Radio Browser (stations). Everything the app sends is
// checked here: only catalog ids, a short plain search text and well-formed item ids reach a
// provider, and only cleaned fields go back to the app.

const ARCHIVE = 'https://archive.org';
const USER_AGENT = 'NetraPlus/1.0 (accessibility app; radio and books)';
const RADIO_SERVERS = ['de1', 'de2', 'nl1', 'at1', 'fi1'].map((s) => `https://${s}.api.radio-browser.info`);

class ContentError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Plain search text: letters, digits and spaces of any script; at most 80 characters. */
function cleanQuery(value) {
  const text = String(value == null ? '' : value).normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s'.-]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
  if (text.length > 80) throw new ContentError('invalid-argument', 'Search text is too long.');
  return text;
}

/** Escapes a word for an Internet Archive (Lucene) query so it cannot change the query. */
function luceneWord(word) {
  return word.replace(/[+\-!(){}[\]^"~*?:\\/&|]/g, (c) => '\\' + c);
}

function asText(v, max) {
  if (Array.isArray(v)) v = v.join(', ');
  const s = String(v == null ? '' : v)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
  return max && s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function httpsOnly(url) {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'https:' ? u.toString() : '';
  } catch (e) { return ''; }
}

async function getJson(url, timeoutMs) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new ContentError('unavailable', `Provider answered ${res.status}`);
  return res.json();
}

// ---------------- Adult content ----------------
// Netra is used by families and children. Sexual content is removed twice: in the search, and
// again on every returned title, author and subject (archive.org tagging is not reliable).
const ADULT_WORDS = [
  'sex', 'sexy', 'sexual', 'erotic', 'erotica', 'porn', 'porno', 'xxx', 'nude', 'nudity', 'adult only', 'adults only',
  'chudai', 'chut', 'lund', 'randi', 'kamukta', 'antarvasna', 'desi kahani', 'hot story', 'hot stories', 'masala story',
  'चुदाई', 'चोद', 'सेक्स', 'कामुक', 'अंतर्वासना', 'नंगी', 'चूत', 'लंड',
  'సెక్స్', 'దెంగ', 'బూతు', 'శృంగార కథ', 'செக்ஸ்', 'காம கதை', 'ಸೆಕ್ಸ್', 'സെക്സ്', 'সেক্স', 'চটি',
];
const ADULT_QUERY = '-subject:(sex OR erotic OR erotica OR porn OR xxx OR adult OR chudai OR kamukta OR antarvasna) ' +
  'AND -title:(sex OR sexy OR erotic OR porn OR xxx OR chudai OR chut OR kamukta OR antarvasna OR चुदाई OR सेक्स)';
const ADULT_RE = new RegExp(ADULT_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
const LATIN_ADULT_RE = /\b(sex|sexy|sexual|erotic|erotica|porn|porno|xxx|nude|chudai|chut|lund|kamukta|antarvasna)\b/i;

/** True when any text shown to the user looks sexual. */
function isAdult(...texts) {
  const t = texts.map((x) => (Array.isArray(x) ? x.join(' ') : String(x || ''))).join(' ');
  return LATIN_ADULT_RE.test(t) || ADULT_RE.test(t.replace(/\b(sussex|essex|middlesex|sextant|sexton)\b/gi, ''));
}

// ---------------- Books ----------------

const BOOK_FORMATS = 'format:("Text PDF" OR "Image Container PDF" OR EPUB OR PDF)';

function bookQuery(language, category, query) {
  const parts = [
    `language:(${language.ia.map((l) => `"${l}"`).join(' OR ')})`,
    'mediatype:texts',
    BOOK_FORMATS,
    '-access-restricted-item:true',
    '-collection:(inlibrary OR printdisabled OR lendinglibrary)',
    ADULT_QUERY,
  ];
  if (category && category.q) parts.push(category.q);
  if (query) {
    const words = query.split(' ').filter(Boolean).slice(0, 8).map(luceneWord);
    parts.push(`(${words.map((w) => `(title:${w} OR creator:${w})`).join(' AND ')})`);
  }
  return parts.join(' AND ');
}

async function searchBooks({ language, category, query, page }) {
  const params = new URLSearchParams({ q: bookQuery(language, category, query), rows: '30', page: String(page), output: 'json' });
  for (const f of ['identifier', 'title', 'creator', 'year', 'downloads', 'format', 'subject']) params.append('fl[]', f);
  if (!query) params.append('sort[]', 'downloads desc');
  const json = await getJson(`${ARCHIVE}/advancedsearch.php?${params}`, 15000);
  const docs = (json.response && json.response.docs) || [];
  const total = Number(json.response && json.response.numFound) || 0;
  const books = docs.filter((d) => ID_RE.test(String(d.identifier || '')) && !isAdult(d.title, d.creator, d.subject)).map((d) => {
    const formats = [].concat(d.format || []).map(String);
    return {
      id: d.identifier,
      title: asText(d.title, 200) || 'Untitled',
      author: asText(d.creator, 120),
      year: asText(d.year, 10),
      downloads: Number(d.downloads) || 0,
      hasPdf: formats.some((f) => /PDF/i.test(f)),
      hasEpub: formats.some((f) => /EPUB/i.test(f)),
      coverUrl: `${ARCHIVE}/services/img/${encodeURIComponent(d.identifier)}`,
    };
  });
  return { books, page, total, hasMore: page * 30 < total };
}

const PDF_RANK = { 'text pdf': 1, 'additional text pdf': 2, 'image container pdf': 3, pdf: 4 };

/** Picks the best downloadable PDF and EPUB from the item's file list (public files only). */
function pickFiles(files) {
  let pdf = null;
  let epub = null;
  for (const f of files || []) {
    const name = String(f.name || '');
    if (!name || name.includes('..') || f.private === 'true' || f.private === true) continue;
    const format = String(f.format || '').toLowerCase();
    const size = Number(f.size) || 0;
    if (/\.pdf$/i.test(name)) {
      const rank = PDF_RANK[format] || 5;
      if (!pdf || rank < pdf.rank) pdf = { name, size, rank };
    } else if (/\.epub$/i.test(name) && (!epub || format === 'epub')) {
      epub = { name, size };
    }
  }
  return { pdf, epub };
}

function fileUrl(id, name) {
  return `${ARCHIVE}/download/${encodeURIComponent(id)}/${name.split('/').map(encodeURIComponent).join('/')}`;
}

async function bookDetail(id) {
  if (!ID_RE.test(String(id || ''))) throw new ContentError('invalid-argument', 'Unknown book.');
  const json = await getJson(`${ARCHIVE}/metadata/${encodeURIComponent(id)}`, 15000);
  const meta = json.metadata;
  if (!meta || meta.mediatype !== 'texts') throw new ContentError('not-found', 'This book is not available.');
  if (String(meta['access-restricted-item']) === 'true') throw new ContentError('not-found', 'This book cannot be downloaded.');
  if (isAdult(meta.title, meta.creator, meta.subject, meta.description)) throw new ContentError('not-found', 'This book is not available.');
  const { pdf, epub } = pickFiles(json.files);
  const downloads = [];
  if (pdf) downloads.push({ format: 'pdf', url: fileUrl(id, pdf.name), size: pdf.size });
  if (epub) downloads.push({ format: 'epub', url: fileUrl(id, epub.name), size: epub.size });
  return {
    id,
    title: asText(meta.title, 300) || 'Untitled',
    author: asText(meta.creator, 200),
    year: asText(meta.date || meta.year, 20),
    language: asText(meta.language, 60),
    publisher: asText(meta.publisher, 120),
    subjects: asText(meta.subject, 300),
    pages: Number(meta.imagecount) || 0,
    description: asText(meta.description, 1500),
    coverUrl: `${ARCHIVE}/services/img/${encodeURIComponent(id)}`,
    downloads,
  };
}

// ---------------- Audio books ----------------

// Spoken word only: audio books, stories and discourses (music collections are left out).
const AUDIO_SOURCE = '(collection:librivoxaudio OR collection:audio_bookspoetry OR subject:(audiobook OR audiobooks OR "audio book" OR librivox OR story OR stories OR katha OR kathalu OR kahani OR novel OR pravachanam OR pravachan OR discourse OR upanyasam))';
const NOT_MUSIC = '-collection:(audio_music OR etree OR netlabels OR georgeblood OR 78rpm)';

function audioQuery(language, category, query) {
  const parts = [
    `language:(${language.ia.map((l) => `"${l}"`).join(' OR ')})`,
    'mediatype:audio',
    AUDIO_SOURCE,
    NOT_MUSIC,
    '-access-restricted-item:true',
    ADULT_QUERY,
  ];
  if (category && category.q) parts.push(category.q);
  if (query) {
    const words = query.split(' ').filter(Boolean).slice(0, 8).map(luceneWord);
    parts.push(`(${words.map((w) => `(title:${w} OR creator:${w})`).join(' AND ')})`);
  }
  return parts.join(' AND ');
}

/** "1:02:03", "62:03" or seconds -> seconds. */
function seconds(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return 0;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const p = s.split(':').map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
}

async function searchAudioBooks({ language, category, query, page }) {
  const params = new URLSearchParams({ q: audioQuery(language, category, query), rows: '30', page: String(page), output: 'json' });
  for (const f of ['identifier', 'title', 'creator', 'downloads', 'runtime', 'subject']) params.append('fl[]', f);
  if (!query) params.append('sort[]', 'downloads desc');
  const json = await getJson(`${ARCHIVE}/advancedsearch.php?${params}`, 15000);
  const docs = (json.response && json.response.docs) || [];
  const total = Number(json.response && json.response.numFound) || 0;
  const books = docs.filter((d) => ID_RE.test(String(d.identifier || '')) && !isAdult(d.title, d.creator, d.subject)).map((d) => ({
    id: d.identifier,
    title: asText(d.title, 200) || 'Untitled',
    author: asText(d.creator, 120),
    duration: seconds(d.runtime),
    downloads: Number(d.downloads) || 0,
    coverUrl: `${ARCHIVE}/services/img/${encodeURIComponent(d.identifier)}`,
  }));
  return { books, page, total, hasMore: page * 30 < total };
}

const MP3_RANK = { '64kbps mp3': 1, 'vbr mp3': 2, '128kbps mp3': 3, '32kbps mp3': 4, 'mp3': 5 };

/** One quality of each chapter (smaller files first), in reading order. */
function pickTracks(id, files) {
  const mp3 = (files || []).filter((f) => {
    const name = String(f.name || '');
    return /\.mp3$/i.test(name) && !name.includes('..') && f.private !== 'true' && f.private !== true && !/_sample\.mp3$/i.test(name);
  });
  if (!mp3.length) return [];
  const byFormat = {};
  for (const f of mp3) {
    const key = String(f.format || 'mp3').toLowerCase();
    (byFormat[key] = byFormat[key] || []).push(f);
  }
  const best = Object.keys(byFormat).sort((a, b) => ((MP3_RANK[a] || 9) - (MP3_RANK[b] || 9)) || (byFormat[b].length - byFormat[a].length))[0];
  const chosen = byFormat[best];
  const num = (v) => { const n = parseInt(String(v || '').split('/')[0], 10); return isNaN(n) ? 100000 : n; };
  chosen.sort((a, b) => (num(a.track) - num(b.track)) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
  return chosen.slice(0, 400).map((f, i) => ({
    index: i,
    title: asText(f.title, 160) || asText(String(f.name).replace(/\.mp3$/i, '').replace(/[_-]+/g, ' '), 160),
    url: fileUrl(id, String(f.name)),
    duration: seconds(f.length),
    size: Number(f.size) || 0,
  }));
}

async function audioBookDetail(id) {
  if (!ID_RE.test(String(id || ''))) throw new ContentError('invalid-argument', 'Unknown audio book.');
  const json = await getJson(`${ARCHIVE}/metadata/${encodeURIComponent(id)}`, 15000);
  const meta = json.metadata;
  if (!meta || meta.mediatype !== 'audio') throw new ContentError('not-found', 'This audio book is not available.');
  if (String(meta['access-restricted-item']) === 'true') throw new ContentError('not-found', 'This audio book cannot be played.');
  if (isAdult(meta.title, meta.creator, meta.subject, meta.description)) throw new ContentError('not-found', 'This audio book is not available.');
  const tracks = pickTracks(id, json.files);
  return {
    id,
    title: asText(meta.title, 300) || 'Untitled',
    author: asText(meta.creator, 200),
    reader: asText(meta.reader || meta.narrator, 120),
    language: asText(meta.language, 60),
    year: asText(meta.date || meta.year, 20),
    description: asText(meta.description, 1500),
    coverUrl: `${ARCHIVE}/services/img/${encodeURIComponent(id)}`,
    duration: tracks.reduce((a, t) => a + t.duration, 0) || seconds(meta.runtime),
    tracks,
  };
}

// ---------------- Radio ----------------

let radioIndex = 0;

/** Tries the Radio Browser mirrors in turn; remembers the one that worked. */
async function radioGet(path) {
  let lastError;
  for (let i = 0; i < RADIO_SERVERS.length; i++) {
    const server = RADIO_SERVERS[(radioIndex + i) % RADIO_SERVERS.length];
    try {
      const data = await getJson(server + path, 8000);
      radioIndex = (radioIndex + i) % RADIO_SERVERS.length;
      return data;
    } catch (e) { lastError = e; }
  }
  throw lastError || new ContentError('unavailable', 'Radio service is busy.');
}

function streamUrl(s) {
  for (const candidate of [s.url_resolved, s.url]) {
    try {
      const u = new URL(String(candidate || ''));
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
    } catch (e) { /* skip */ }
  }
  return '';
}

function cleanStation(s) {
  const url = streamUrl(s);
  if (!url || !UUID_RE.test(String(s.stationuuid || ''))) return null;
  return {
    id: s.stationuuid,
    name: asText(s.name, 120) || 'Radio station',
    streamUrl: url,
    logoUrl: httpsOnly(s.favicon),
    country: asText(s.country, 60),
    state: asText(s.state, 60),
    language: asText(s.language, 60),
    tags: asText(s.tags, 120),
    codec: asText(s.codec, 12),
    bitrate: Number(s.bitrate) || 0,
    votes: Number(s.votes) || 0,
    hls: Number(s.hls) === 1,
  };
}

function dedupe(stations) {
  const seen = new Set();
  return stations.filter((s) => {
    if (!s) return false;
    const key = s.name.toLowerCase() + '|' + s.streamUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function radioStations({ language, category, query, offset }) {
  const params = new URLSearchParams({
    limit: '40', offset: String(offset), order: 'votes', reverse: 'true', hidebroken: 'true',
  });
  if (language) params.set('language', language.radio);
  if (category && category.tag) { params.set('tag', category.tag); params.set('tagExact', 'false'); }
  if (query) params.set('name', query);
  const raw = await radioGet(`/json/stations/search?${params}`);
  const stations = dedupe((Array.isArray(raw) ? raw : []).map(cleanStation));
  return { stations, offset, hasMore: (Array.isArray(raw) ? raw.length : 0) >= 40 };
}

async function radioByIds(ids) {
  const clean = [...new Set((ids || []).map(String).filter((id) => UUID_RE.test(id)))].slice(0, 60);
  if (!clean.length) return { stations: [] };
  const raw = await radioGet(`/json/stations/byuuid?uuids=${clean.join(',')}`);
  return { stations: dedupe((Array.isArray(raw) ? raw : []).map(cleanStation)) };
}

/** Radio Browser asks apps to count each play. */
async function radioClick(id) {
  if (!UUID_RE.test(String(id || ''))) throw new ContentError('invalid-argument', 'Unknown station.');
  try { await radioGet(`/json/url/${id}`); } catch (e) { /* counting is best effort */ }
  return { ok: true };
}

module.exports = {
  ContentError, cleanQuery, luceneWord, bookQuery, pickFiles, cleanStation,
  searchBooks, bookDetail, radioStations, radioByIds, radioClick, ID_RE, UUID_RE,
  searchAudioBooks, audioBookDetail, pickTracks, isAdult,
};
