(() => {
  "use strict";

  const STATUSES = [
    { key: "saved",     label: "Saved",     color: "var(--status-neutral)"  },
    { key: "applied",   label: "Applied",   color: "var(--series-1)"        },
    { key: "interview", label: "Interview", color: "var(--status-warning)"  },
    { key: "offer",     label: "Offer",     color: "var(--status-good)"     },
    { key: "rejected",  label: "Rejected",  color: "var(--status-critical)" },
  ];
  const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

  const state = {
    applications: [],
    view: "board",
    statusFilter: "all",
    search: "",
    sortKey: "company",
    sortDir: 1,
    editingId: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function filteredApplications() {
    const q = state.search.trim().toLowerCase();
    return state.applications.filter((a) => {
      if (state.statusFilter !== "all" && a.status !== state.statusFilter) return false;
      if (!q) return true;
      return (
        (a.company || "").toLowerCase().includes(q) ||
        (a.role || "").toLowerCase().includes(q)
      );
    });
  }

  // ---- Stats -----------------------------------------------------------
  function renderStats() {
    const all = state.applications;
    const counts = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
    all.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });

    const submitted = counts.applied + counts.interview + counts.offer + counts.rejected;
    const responded = counts.interview + counts.offer + counts.rejected;
    const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : 0;

    const tiles = [
      { label: "Total", value: all.length, color: "var(--text-muted)" },
      ...STATUSES.map((s) => ({ label: s.label, value: counts[s.key], color: s.color })),
      { label: "Response rate", value: `${responseRate}%`, color: "var(--series-1)" },
    ];

    const el = $("#stats");
    el.innerHTML = "";
    tiles.forEach((t) => {
      const tile = document.createElement("div");
      tile.className = "stat-tile";
      tile.innerHTML = `
        <div class="stat-tile__label">
          <span class="stat-tile__dot" style="background:${t.color}"></span>
          <span>${t.label}</span>
        </div>
        <div class="stat-tile__value">${t.value}</div>
      `;
      el.appendChild(tile);
    });
  }

  // ---- Board -------------------------------------------------------------
  function renderBoard() {
    const el = $("#board-view");
    el.innerHTML = "";
    const apps = filteredApplications();

    STATUSES.forEach((status) => {
      const items = apps.filter((a) => a.status === status.key);
      const col = document.createElement("div");
      col.className = "board-column";
      col.innerHTML = `
        <div class="board-column__header">
          <span class="board-column__dot" style="background:${status.color}"></span>
          <span>${status.label}</span>
          <span class="board-column__count">${items.length}</span>
        </div>
        <div class="board-column__cards"></div>
      `;
      const cardsWrap = $(".board-column__cards", col);

      if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "column-empty";
        empty.textContent = "No applications";
        cardsWrap.appendChild(empty);
      } else {
        items.forEach((a) => cardsWrap.appendChild(buildCard(a)));
      }
      el.appendChild(col);
    });
  }

  function buildCard(a) {
    const tpl = $("#card-template");
    const node = tpl.content.cloneNode(true);
    $(".card__company", node).textContent = a.company || "Untitled";
    $(".card__role", node).textContent = a.role || "";

    const coverEl = $(".card__cover-letter", node);
    if (a.coverLetterLink) {
      coverEl.textContent = "✓ Cover letter";
      coverEl.setAttribute("href", a.coverLetterLink);
      coverEl.classList.add("is-written");
    } else {
      coverEl.textContent = "✕ No cover letter";
      coverEl.removeAttribute("href");
      coverEl.classList.remove("is-written");
    }

    const meta = $(".card__meta", node);
    const rows = [];
    if (a.dateApplied) rows.push(["Applied", fmtDate(a.dateApplied)]);
    if (a.deadline) rows.push(["Deadline", fmtDate(a.deadline)]);
    if (a.nextStep) rows.push(["Next", a.nextStep]);
    if (a.nextStepDate) rows.push(["Next date", fmtDate(a.nextStepDate)]);
    rows.forEach(([dt, dd]) => {
      const dtEl = document.createElement("dt");
      dtEl.textContent = dt;
      const ddEl = document.createElement("dd");
      ddEl.textContent = dd;
      meta.appendChild(dtEl);
      meta.appendChild(ddEl);
    });

    const notes = $(".card__notes", node);
    if (a.notes) notes.textContent = a.notes; else notes.remove();

    const link = $(".card__link", node);
    if (a.link) link.setAttribute("href", a.link); else link.removeAttribute("href");

    const card = node.firstElementChild;
    attachEditOnClick(card, a);
    return card;
  }

  // ---- Table -------------------------------------------------------------
  function renderTable() {
    const body = $("#table-body");
    const emptyMsg = $("#table-empty");
    body.innerHTML = "";

    let apps = filteredApplications();
    apps = apps.slice().sort((a, b) => {
      const av = (a[state.sortKey] || "").toString().toLowerCase();
      const bv = (b[state.sortKey] || "").toString().toLowerCase();
      if (av < bv) return -1 * state.sortDir;
      if (av > bv) return 1 * state.sortDir;
      return 0;
    });

    if (apps.length === 0) {
      emptyMsg.classList.remove("is-hidden");
    } else {
      emptyMsg.classList.add("is-hidden");
    }

    apps.forEach((a) => {
      const status = STATUS_BY_KEY[a.status] || STATUS_BY_KEY.saved;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-col="company">${escapeHtml(a.company || "")}</td>
        <td data-col="role">${escapeHtml(a.role || "")}</td>
        <td data-col="status">
          <span class="badge"><span class="badge__dot" style="background:${status.color}"></span>${status.label}</span>
        </td>
        <td data-col="dateApplied">${fmtDate(a.dateApplied)}</td>
        <td data-col="deadline">${fmtDate(a.deadline)}</td>
        <td data-col="nextStepDate">${a.nextStep ? escapeHtml(a.nextStep) + (a.nextStepDate ? " · " + fmtDate(a.nextStepDate) : "") : "—"}</td>
        <td data-col="coverLetterLink">
          ${a.coverLetterLink
            ? `<a class="badge badge--good" href="${escapeAttr(a.coverLetterLink)}" target="_blank" rel="noopener">✓ Cover letter</a>`
            : `<span class="badge badge--muted">✕ No cover letter</span>`}
        </td>
        <td data-col="link">${a.link ? `<a href="${escapeAttr(a.link)}" target="_blank" rel="noopener">Open →</a>` : "—"}</td>
      `;
      attachEditOnClick(tr, a);
      body.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function renderAll() {
    renderStats();
    renderBoard();
    renderTable();
  }

  // ---- Controls ------------------------------------------------------
  function setupControls() {
    $("#search").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderBoard();
      renderTable();
    });

    $("#status-filter").addEventListener("change", (e) => {
      state.statusFilter = e.target.value;
      renderBoard();
      renderTable();
    });

    $$(".view-toggle__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.view = btn.dataset.view;
        $$(".view-toggle__btn").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        $("#board-view").classList.toggle("is-hidden", state.view !== "board");
        $("#table-view").classList.toggle("is-hidden", state.view !== "table");
      });
    });

    $$("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sortKey === key) {
          state.sortDir *= -1;
        } else {
          state.sortKey = key;
          state.sortDir = 1;
        }
        renderTable();
      });
    });

    const themeToggle = $("#theme-toggle");
    const applyTheme = (theme) => {
      if (theme) document.documentElement.setAttribute("data-theme", theme);
      else document.documentElement.removeAttribute("data-theme");
      themeToggle.querySelector(".theme-toggle__label").textContent =
        theme === "dark" ? "Light mode" : "Dark mode";
    };
    const saved = localStorage.getItem("the-click-bait-theme");
    if (saved) applyTheme(saved);
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("the-click-bait-theme", next);
      applyTheme(next);
    });
  }

  // ---- Locally-added / locally-edited applications -----------------------
  // Applications added via "+ Add application" live only in this browser
  // (localStorage) — data/applications.json stays the versioned source of
  // truth unless someone copies an entry into it by hand. Edits made to an
  // application that came from applications.json are stored the same way,
  // keyed by id, and overlaid on top of the JSON data at load time.
  const LOCAL_APPS_KEY = "the-click-bait-local-applications";
  const OVERRIDES_KEY = "the-click-bait-overrides";
  const DELETED_KEY = "the-click-bait-deleted";

  const isLocalId = (id) => typeof id === "string" && id.startsWith("local-");

  function loadLocalApplications() {
    try {
      const raw = localStorage.getItem(LOCAL_APPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveLocalApplications(apps) {
    localStorage.setItem(LOCAL_APPS_KEY, JSON.stringify(apps));
  }

  function loadOverrides() {
    try {
      const raw = localStorage.getItem(OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  function saveOverrides(overrides) {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  }

  function loadDeletedIds() {
    try {
      const raw = localStorage.getItem(DELETED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveDeletedIds(ids) {
    localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
  }

  function persistNew(app) {
    const localApps = loadLocalApplications();
    localApps.push(app);
    saveLocalApplications(localApps);
  }
  function persistEdit(app) {
    if (isLocalId(app.id)) {
      const localApps = loadLocalApplications().map((a) => (a.id === app.id ? app : a));
      saveLocalApplications(localApps);
    } else {
      const overrides = loadOverrides();
      overrides[app.id] = app;
      saveOverrides(overrides);
    }
  }
  function persistDelete(id) {
    if (isLocalId(id)) {
      saveLocalApplications(loadLocalApplications().filter((a) => a.id !== id));
      return;
    }
    const overrides = loadOverrides();
    if (overrides[id]) {
      delete overrides[id];
      saveOverrides(overrides);
    }
    const deleted = loadDeletedIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      saveDeletedIds(deleted);
    }
  }

  // Clicking a card or table row (but not a link inside it) opens it for editing.
  function attachEditOnClick(el, app) {
    el.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link && link.hasAttribute("href")) return;
      openDialog(app);
    });
  }

  // ---- Add / edit dialog --------------------------------------------------
  function openDialog(app) {
    const dialog = $("#add-dialog");
    const form = $("#add-form");
    form.reset();
    $("#autofill-status").textContent = "";
    state.editingId = app ? app.id : null;
    $("#add-dialog-title").textContent = app ? "Edit application" : "Add application";
    $("#add-submit").textContent = app ? "Save changes" : "Add application";
    $("#add-delete").classList.toggle("is-hidden", !app);

    if (app) {
      form.company.value = app.company || "";
      form.role.value = app.role || "";
      form.status.value = app.status || "saved";
      form.dateApplied.value = app.dateApplied || "";
      form.deadline.value = app.deadline || "";
      form.nextStep.value = app.nextStep || "";
      form.nextStepDate.value = app.nextStepDate || "";
      form.contact.value = app.contact || "";
      form.link.value = app.link || "";
      form.notes.value = app.notes || "";
      form.coverLetterLink.value = app.coverLetterLink || "";
    }

    dialog.showModal();
  }

  // Best-effort: fetch the job posting through a public reader proxy and
  // guess role/company from its page title. Always falls back to letting the
  // person fill the form in by hand — this will not work for every site.
  function guessFromTitle(title) {
    const t = title.split(" | ")[0].trim();
    const seps = [" chez ", " at ", " - ", " – ", " — "];
    for (const sep of seps) {
      const idx = t.indexOf(sep);
      if (idx > -1) {
        return { role: t.slice(0, idx).trim(), company: t.slice(idx + sep.length).trim() };
      }
    }
    return { role: t, company: "" };
  }

  function setupAutofill() {
    const urlInput = $("#autofill-url");
    const btn = $("#autofill-btn");
    const status = $("#autofill-status");
    const form = $("#add-form");

    btn.addEventListener("click", async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      btn.disabled = true;
      status.textContent = "Fetching…";
      try {
        const res = await fetch(`https://r.jina.ai/${url}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const match = text.match(/^Title:\s*(.+)$/m);
        if (!match) throw new Error("No title found");
        const { role, company } = guessFromTitle(match[1].trim());
        if (role) form.role.value = role;
        if (company) form.company.value = company;
        form.link.value = url;
        status.textContent = "Filled from the page title — double-check company/role before saving.";
      } catch (err) {
        console.error("Autofill failed —", err);
        form.link.value = url;
        status.textContent = "Couldn't auto-fill from that link — fill in the rest manually.";
      } finally {
        btn.disabled = false;
      }
    });
  }

  function setupAddForm() {
    const dialog = $("#add-dialog");
    const form = $("#add-form");

    $("#add-application").addEventListener("click", () => openDialog(null));
    $("#add-cancel").addEventListener("click", () => dialog.close());
    setupAutofill();

    $("#add-delete").addEventListener("click", () => {
      if (!state.editingId) return;
      const id = state.editingId;
      const app = state.applications.find((a) => a.id === id);
      const label = app ? [app.company, app.role].filter(Boolean).join(" — ") : "this application";
      if (!confirm(`Delete "${label}"? This can't be undone.`)) return;
      state.applications = state.applications.filter((a) => a.id !== id);
      persistDelete(id);
      dialog.close();
      renderAll();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const company = (fd.get("company") || "").toString().trim();
      if (!company) return;

      const app = {
        id: state.editingId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        company,
        role: (fd.get("role") || "").toString().trim(),
        status: (fd.get("status") || "saved").toString(),
        dateApplied: (fd.get("dateApplied") || "").toString(),
        deadline: (fd.get("deadline") || "").toString(),
        nextStep: (fd.get("nextStep") || "").toString().trim(),
        nextStepDate: (fd.get("nextStepDate") || "").toString(),
        contact: (fd.get("contact") || "").toString().trim(),
        link: (fd.get("link") || "").toString().trim(),
        notes: (fd.get("notes") || "").toString().trim(),
        coverLetterLink: (fd.get("coverLetterLink") || "").toString().trim(),
      };

      if (state.editingId) {
        state.applications = state.applications.map((a) => (a.id === app.id ? app : a));
        persistEdit(app);
      } else {
        state.applications.push(app);
        persistNew(app);
      }

      dialog.close();
      renderAll();
    });
  }

  // ---- Send-from-browser bookmarklet --------------------------------------
  // The bookmarklet (see README) opens this site with ?link=<job url> and
  // &title=<page title> for the job posting the person was already looking
  // at. No fetch needed — the title came straight from their browser — so
  // this just reuses the same title-guessing heuristic as the paste-a-link
  // autofill and opens the form pre-filled for review.
  function openFromQueryParams() {
    const params = new URLSearchParams(location.search);
    const link = params.get("link");
    if (!link) return;
    history.replaceState({}, "", location.pathname);

    openDialog(null);
    const form = $("#add-form");
    form.link.value = link;

    const title = params.get("title");
    if (title) {
      const { role, company } = guessFromTitle(title);
      if (role) form.role.value = role;
      if (company) form.company.value = company;
      $("#autofill-status").textContent = "Filled from the page title — double-check company/role before saving.";
    }
  }

  // ---- Boot ------------------------------------------------------------
  async function init() {
    setupControls();
    setupAddForm();

    let remote = [];
    try {
      const res = await fetch("data/applications.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      remote = await res.json();
    } catch (err) {
      console.error("Could not load data/applications.json —", err);
      const el = $("#stats");
      el.innerHTML = `<p class="empty-state">Could not load data/applications.json. If you opened this file directly (file://), run a local server instead — see README.md.</p>`;
    }
    const overrides = loadOverrides();
    const deletedIds = loadDeletedIds();
    const base = [...remote, ...loadLocalApplications()].filter((a) => !deletedIds.includes(a.id));
    state.applications = base.map((a) => overrides[a.id] || a);
    renderAll();
    openFromQueryParams();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
