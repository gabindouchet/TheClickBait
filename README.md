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
  "notes": "Referred by a former classmate."
}
```

`status` must be one of: `saved`, `applied`, `interview`, `offer`, `rejected`.
Any field can be left as an empty string `""` if you don't have that info yet.
`id` just needs to be unique — a short slug is fine.

To add a new application, copy an existing entry inside the `[ ... ]` array,
give it a unique `id`, and fill in the fields. Save the file — that's it.

## Option A — Start here if you're new to GitHub (no command line, no git)

Everything below happens in your browser on github.com. No installs.

1. **Create a GitHub account** at [github.com/signup](https://github.com/signup)
   — it's free.
2. **Create a new repository**: click the **+** in the top-right corner →
   **New repository**. Name it something like `the-click-bait`.
   Leave it **Public** (required for free GitHub Pages) and don't check any
   of the "initialize with…" boxes. Click **Create repository**.
3. **Unzip** the file I sent you on your computer, so you have a plain
   `the-click-bait` folder with `index.html`, `assets/`, `data/`,
   etc. inside it.
4. **Upload the files**: on your new (empty) repo's page, click
   **"uploading an existing file"** (or **Add file → Upload files**). Open
   the unzipped folder on your computer, select *everything inside it*
   (`index.html`, the `assets` folder, the `data` folder, `README.md`,
   `.gitignore` — all of it), and drag them into the browser window. Scroll
   down, add a message like "Initial dashboard", click **Commit changes**.
5. **Turn on GitHub Pages**: go to your repo's **Settings** tab → **Pages**
   (left sidebar). Under "Build and deployment", set **Branch** to `main`
   and folder to `/ (root)`, then **Save**.
6. GitHub shows you a live URL like
   `https://<your-username>.github.io/the-click-bait/` — give it
   a minute or two after your first upload, then open it.

**To update your applications later**, no re-upload needed: in your repo,
click into the `data` folder → click `applications.json` → click the pencil
(✏️) icon to edit → make your changes right there in the browser → scroll
down → **Commit changes**. The live site updates automatically within a
minute.

## Option B — Using VS Code and git (once you're comfortable)

This is faster once you know it, but it's optional — Option A does
everything you need.

1. **Open the project folder** in VS Code: `File → Open Folder…`
2. Install the **Live Server** extension (by Ritwick Dey) from the Extensions
   panel — this lets you preview the site with a real local server, which the
   site needs (opening `index.html` directly with double-click will show a
   blank dashboard because browsers block `fetch()` on `file://` URLs).
3. Right-click `index.html` in the file explorer → **Open with Live Server**.
   The site opens in your browser and reloads automatically whenever you save
   a file — including `data/applications.json`.

   No Live Server? You can also run a plain local server from VS Code's
   built-in terminal (`` Ctrl+` ``/`` Cmd+` ``):
   ```bash
   python3 -m http.server 8000
   ```
   then open `http://localhost:8000` in your browser.
4. **Create a new repository** on GitHub (e.g. `the-click-bait`).
   Don't initialize it with a README — you already have one.
5. In VS Code's terminal, from this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
   (VS Code's built-in **Source Control** panel can do all of this through
   the UI too, if you prefer clicking over typing.)
6. Turn on GitHub Pages the same way as step 5 in Option A.
7. To update later:
   ```bash
   # edit data/applications.json in VS Code, then:
   git add data/applications.json
   git commit -m "Add application: <company>"
   git push
   ```

## Notes

- The board/table only *display* data — there's no in-browser "add" form by
  design, so your data always stays as one clean, versioned JSON file you can
  read a diff of in `git log`.
- Dark mode follows your OS setting automatically, or use the toggle in the
  top-right corner (remembered per-browser).
- Everything is plain HTML/CSS/JS — no dependencies to install, no build
  step, nothing to go out of date.
