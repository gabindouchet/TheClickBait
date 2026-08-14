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

    return node.firstElementChild;
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
        <td data-col="link">${a.link ? `<a href="${escapeAttr(a.link)}" target="_blank" rel="noopener">Open →</a>` : "—"}</td>
      `;
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

  // ---- Boot ------------------------------------------------------------
  async function init() {
    setupControls();
    try {
      const res = await fetch("data/applications.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.applications = await res.json();
    } catch (err) {
      console.error("Could not load data/applications.json —", err);
      const el = $("#stats");
      el.innerHTML = `<p class="empty-state">Could not load data/applications.json. If you opened this file directly (file://), run a local server instead — see README.md.</p>`;
    }
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
