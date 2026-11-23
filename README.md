# Netra Plus content: Netra Radio stations

The Netra Plus app reads these files for free. No Firebase, no Cloud Functions, no server.

- `data/catalog.json`: languages, categories and on/off switches
- `data/radio/<language>/<category>.json`: the first 40 stations for each language and category

The app reads them through jsDelivr, and through GitHub raw if jsDelivr does not answer:

    https://cdn.jsdelivr.net/gh/NetraXInnovations/netra-content@main/data/radio/telugu/all.json
    https://raw.githubusercontent.com/NetraXInnovations/netra-content/main/data/radio/telugu/all.json

Radio search and more stations come straight from the free Radio Browser service
(radio-browser.info) on the phone. eBooks and Audio Books are not stored here: the app asks the
free Internet Archive (archive.org) directly.

## Automatic daily refresh

A GitHub Action (`.github/workflows/refresh.yml`) rebuilds the station lists every day at
02:00 India time. Nothing needs to be uploaded by hand.

## Everyday changes (no app update)

- **Switch a feature off:** in `settings.json` set `"radioEnabled": false` (or `ebooksEnabled`,
  `audioEnabled`) and commit. The app shows "temporarily unavailable".
- **Change languages or radio categories:** add `"languages"` or `"radioCategories"` to
  `settings.json`, in the same format as in `scripts/catalog.js`, then commit. The workflow
  rebuilds the lists.
- **Refresh now:** Actions → "Refresh Netra Radio stations" → Run workflow.

Phones keep each list until midnight India time. jsDelivr can take up to 12 hours to show a change.
With no internet, the phone shows the last lists it saved.

## Run it on a computer

    node scripts/build.js

Needs Node 18 or newer. If a list cannot be fetched, yesterday's file is kept.
