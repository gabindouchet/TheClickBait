# The Click Bait

A tiny static website that tracks apprenticeship applications: a kanban board,
a sortable/filterable table, and summary stats — all rendered from one JSON
file. No build step, no backend, no database. You edit a data file, push to
GitHub, and the live site updates itself via GitHub Pages.

## How it works

- `index.html` — page structure
- `assets/style.css` — styling (light/dark mode)
- `assets/app.js` — reads `data/applications.json` and renders the stats,
  board, and table
- `data/applications.json` — **this is the only file you'll edit day to day**

Each entry in `applications.json` looks like this:

```json
{
  "id": "acme-swe-2026",
  "company": "Acme Robotics",
  "role": "Software Engineering Apprentice",
  "status": "applied",
  "dateApplied": "2026-07-15",
  "deadline": "2026-07-30",
  "nextStep": "Technical interview",
  "nextStepDate": "2026-08-22",
  "contact": "Jane Diallo — jane@acme.example",
  "link": "https://acme.example/careers/123",
  "notes": "Referred by a former classmate.",
  "coverLetterLink": ""
}
```

`coverLetterLink` holds a link to your cover letter for that application (a
Google Doc link, for example). Leave it `""` if you haven't written one yet —
the cover-letter indicator on each card/table row reflects whether it's set.

`status` must be one of: `saved`, `applied`, `interview`, `offer`, `rejected`.
Any field can be left as an empty string `""` if you don't have that info yet.
`id` just needs to be unique — a short slug is fine.

To add a new application, copy an existing entry inside the `[ ... ]` array,
give it a unique `id`, and fill in the fields. Save the file — that's it.

## Updating the live site

The repo is already connected to GitHub Pages at
`https://gabindouchet.github.io/TheClickBait/`. To publish a change:

```bash
git add -A
git commit -m "Describe the change"
git push
```

The live site updates automatically within a minute. You can also edit
`data/applications.json` directly on github.com (open the file → pencil icon
→ commit) if you'd rather not use the terminal.

## Notes

- The **+ Add application** button lets you add an entry from the browser,
  optionally by pasting a job posting link (Indeed, Welcome to the Jungle,
  JobTeaser, …) and clicking **Autofill** — it fetches the page through a
  public reader service and guesses the role/company from its title. This is
  best-effort and won't work for every site; always double-check the filled
  fields, or just fill the form in by hand.
- **Click any card or table row** to reopen that same form pre-filled, so you
  can update its status, dates, or cover letter link — or click **Delete** in
  that panel to remove the entry (with a confirmation first).
- **"Add to Click Bait" bookmarklet** — a one-click way to send a job posting
  you're currently viewing (Indeed, Welcome to the Jungle, JobTeaser, …)
  straight into the Add form, without copy-pasting the link yourself. Set it
  up once:
  1. In Safari: **View → Show Favorites Bar**.
  2. Bookmark any page (⌘D), name it "Add to Click Bait", save it to Favorites.
  3. Right-click that new bookmark → **Edit Address** → replace the URL with:
     ```
     javascript:(function(){window.open('https://gabindouchet.github.io/TheClickBait/?link='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank');})();
     ```
  4. Now, while looking at a job posting, click that bookmark. It opens The
     Click Bait in a new tab with the link and a role/company guess (from the
     page's title, no fetch needed) already filled in — review and save.
- Additions and edits are saved to that browser's `localStorage`, not to
  `data/applications.json` — they only show up for you, on that
  device/browser. To make a change permanent (visible to everyone, and
  versioned in git), copy its fields into `data/applications.json` by hand
  and commit.
- Dark mode follows your OS setting automatically, or use the toggle in the
  top-right corner (remembered per-browser).
- Everything is plain HTML/CSS/JS — no dependencies to install, no build
  step, nothing to go out of date.
