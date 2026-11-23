# Netra Plus content: Radio, eBooks, Audio Books

The Netra Plus app reads these files for free. No Firebase, no Cloud Functions, no server.

- `data/catalog.json`: languages, categories and on/off switches
- `data/radio/<language>/<category>.json`: the first 40 stations
- `data/ebooks/<language>/<category>.json`: the first 30 books
- `data/audio/<language>/<category>.json`: the first 30 audio books

The app reads them through jsDelivr, and through GitHub raw if jsDelivr does not answer:

    https://cdn.jsdelivr.net/gh/NetraXInnovations/netra-content@main/data/catalog.json
    https://raw.githubusercontent.com/NetraXInnovations/netra-content/main/data/catalog.json

Searches, more results, book details and audio chapters come straight from the free
Internet Archive (archive.org) and Radio Browser (radio-browser.info) services on the phone.

## One-time setup

1. On github.com, create a **public** repository named `netra-content` under `NetraXInnovations`.
   If you use another name, change `CONTENT_REPO` in
   `app/src/main/java/com/netrax/plus/network/NetraContentApi.kt`.
2. Upload everything in this folder, including `.github/workflows/refresh.yml`.
3. In the repository, open **Settings → Actions → General → Workflow permissions** and choose
   **Read and write permissions**, then click Save.
4. Open the **Actions** tab, choose "Refresh Radio, eBooks and Audio Books lists" and click
   **Run workflow** once.

After that the lists refresh by themselves every day at 02:00 India time.

## Everyday changes (no app update)

- **Switch a feature off:** in `settings.json` set `"radioEnabled": false` (or `ebooksEnabled`,
  `audioEnabled`) and commit. The app shows "temporarily unavailable".
- **Change languages or categories:** add `"languages"`, `"bookCategories"`, `"radioCategories"`
  or `"audioCategories"` to `settings.json`, in the same format as in `scripts/catalog.js`, then
  commit. The workflow rebuilds the lists.
- **Refresh now:** Actions → Run workflow.

Phones keep each list until midnight India time. jsDelivr can take up to 12 hours to show a change.
With no internet, the phone shows the last lists it saved.

## Run it on a computer

    node scripts/build.js

Needs Node 18 or newer. If a list cannot be fetched, yesterday's file is kept.
