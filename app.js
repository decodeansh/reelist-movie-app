/* REELIST — vanilla JS, powered by the TMDB API + optional Firebase (Google sign-in
   and cloud-synced watchlist/history). No build step required. */

const CONFIG = window.REELIST_CONFIG || {};
const TMDB_API_KEY = CONFIG.TMDB_API_KEY || "";
const FIREBASE_CONFIG = CONFIG.FIREBASE_CONFIG || {};
const FIREBASE_ENABLED = !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey);

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const WATCHLIST_STORAGE = "reelist_watchlist";
const HISTORY_STORAGE = "reelist_history";

const QUICK_LISTS = [
  { key: "trending", label: "Trending this week", path: "/trending/movie/week", params: {} },
  { key: "popular", label: "Popular", path: "/movie/popular", params: {} },
  { key: "top_rated", label: "Top Rated", path: "/movie/top_rated", params: {} },
  { key: "now_playing", label: "Now Playing", path: "/movie/now_playing", params: {} },
  { key: "upcoming", label: "Upcoming", path: "/movie/upcoming", params: {} },
];

const state = {
  apiKey: TMDB_API_KEY,
  query: "",
  source: { type: "trending" },
  genreFilter: "All",
  genreMap: {},
  movies: [],
  heading: "Trending this week",
  watchlist: safeParse(localStorage.getItem(WATCHLIST_STORAGE)) || [],
  history: safeParse(localStorage.getItem(HISTORY_STORAGE)) || [],
  user: null,
  selectedMovieId: null,
  detailCache: null,
  tab: "browse",
  loadingMovies: false,
  listError: null,
};

function safeParse(str) { try { return JSON.parse(str); } catch (e) { return null; } }

/* ------------------------------- Icons (inline SVG) ------------------------------- */

const ICON = {
  search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  star: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  bookmarkCheck: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M9 10.5l1.7 1.7L14.5 8.5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  film: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="19" height="17" rx="2"/><line x1="7" y1="3.5" x2="7" y2="20.5"/><line x1="17" y1="3.5" x2="17" y2="20.5"/><line x1="2.5" y1="9" x2="7" y2="9"/><line x1="2.5" y1="15" x2="7" y2="15"/><line x1="17" y1="9" x2="21.5" y2="9"/><line x1="17" y1="15" x2="21.5" y2="15"/></svg>`,
  ticket: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 1 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 1 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  user: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

/* ---------------------------------- Helpers ---------------------------------- */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function imgUrl(path, size = "w500") { return path ? `${IMG_BASE}/${size}${path}` : null; }
function yearOf(dateStr) { return dateStr ? dateStr.slice(0, 4) : "—"; }
function ratingBadge(rating, size = "") {
  const val = rating ? rating.toFixed(1) : "—";
  return `<span class="rating-badge ${size}">${ICON.star}${val}</span>`;
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function tmdb(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", state.apiKey);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = new Error(res.status === 401 ? "TMDB rejected the API key — check config.js." : `TMDB request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* Poster / art fallback for missing images */
function posterArtHTML(title, wide) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (Math.imul(31, h) + title.charCodeAt(i)) | 0;
  h = Math.abs(h);
  const palettes = [["#E7B740", "#5C2A3B"], ["#9C4F63", "#241019"], ["#3B5249", "#0F1D1A"], ["#6B3F2A", "#241019"], ["#2E3A59", "#0F1420"], ["#B0562E", "#241019"]];
  const [c1, c2] = palettes[h % palettes.length];
  const angle = 20 + (h % 6) * 30;
  const pattern = h % 3;
  const bg = pattern === 0 ? `linear-gradient(${angle}deg, ${c1}, ${c2})`
    : pattern === 1 ? `radial-gradient(circle at ${25 + (h % 50)}% ${20 + ((h >> 3) % 60)}%, ${c1}, ${c2} 75%)`
    : `linear-gradient(180deg, ${c1} 0%, ${c2} 100%)`;
  return `<div class="poster-art" style="background:${bg}">${wide ? "" : `<div class="poster-title">${escapeHtml(title)}</div>`}</div>`;
}
function posterHTML(path, title, size = "w500", wide = false) {
  const url = imgUrl(path, size);
  if (!url) return posterArtHTML(title, wide);
  return `<img class="poster-img" src="${url}" alt="${escapeHtml(title)} poster" loading="lazy" />`;
}

function findMovie(id) {
  id = Number(id);
  return state.movies.find((m) => m.id === id)
    || state.watchlist.find((m) => m.id === id)
    || state.history.find((m) => m.id === id)
    || (state.detailCache && state.detailCache.id === id ? state.detailCache : null);
}

/* ------------------------------- Watchlist & history ------------------------------ */

function persistWatchlist() { localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(state.watchlist)); scheduleCloudSave(); }
function persistHistory() { localStorage.setItem(HISTORY_STORAGE, JSON.stringify(state.history)); scheduleCloudSave(); }

function toggleWatchlist(movie) {
  const exists = state.watchlist.some((m) => m.id === movie.id);
  if (exists) {
    state.watchlist = state.watchlist.filter((m) => m.id !== movie.id);
  } else {
    state.watchlist.push({
      id: movie.id, title: movie.title, poster_path: movie.poster_path,
      vote_average: movie.vote_average, release_date: movie.release_date,
    });
  }
  persistWatchlist();
  renderNavCounts();
  if (state.tab === "browse") renderGrid();
  if (state.tab === "watchlist") renderWatchlistTab();
}

function addHistory(detail) {
  state.history = state.history.filter((h) => h.id !== detail.id);
  state.history.unshift({
    id: detail.id, title: detail.title, poster_path: detail.poster_path,
    vote_average: detail.vote_average, release_date: detail.release_date, viewed_at: Date.now(),
  });
  if (state.history.length > 50) state.history.length = 50;
  persistHistory();
}
function removeHistoryItem(id) {
  state.history = state.history.filter((h) => h.id !== id);
  persistHistory();
  if (state.tab === "history") renderHistoryTab();
}
function clearHistory() {
  state.history = [];
  persistHistory();
  renderHistoryTab();
}

/* ------------------------------------- Shell ----------------------------------- */

function renderShell() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="filmstrip"></div>
    <nav class="navbar">
      <div class="navbar-inner">
        <button class="menu-btn" id="menu-open-btn" aria-label="Open menu">${ICON.menu}</button>
        <button class="logo display" id="logo-btn" style="background:none;border:none;padding:0;" aria-label="REELIST home">${ICON.film}REEL<span>IST</span></button>
        <div class="search-wrap">
          ${ICON.search}
          <input type="text" id="search-input" placeholder="Search TMDB by movie title…" aria-label="Search movies" />
        </div>
        <div class="nav-tabs">
          <button class="nav-tab" id="tab-browse">Browse</button>
          <button class="nav-tab" id="tab-watchlist">${ICON.ticket} Watchlist <span class="watch-count" id="watch-count">0</span></button>
          <div class="account-wrap" id="account-wrap"></div>
        </div>
      </div>
    </nav>
    <div id="hero-slot"></div>
    <div class="filmstrip"></div>
    <main class="browse-section" id="main-content"></main>
    <footer>REELIST — powered by the TMDB API. This product uses the TMDB API but is not endorsed or certified by TMDB.</footer>
  `;

  document.getElementById("search-input").addEventListener("input", debounce((e) => {
    const q = e.target.value.trim();
    state.source = q ? { type: "search", query: q } : { type: "trending" };
    state.tab = "browse";
    updateTabButtons();
    fetchMovies();
  }, 400));
  document.getElementById("menu-open-btn").addEventListener("click", openMenu);
  document.getElementById("logo-btn").addEventListener("click", goHome);
  document.getElementById("tab-browse").addEventListener("click", () => setTab("browse"));
  document.getElementById("tab-watchlist").addEventListener("click", () => setTab("watchlist"));

  renderNavCounts();
  updateTabButtons();
}

function goHome() {
  state.source = { type: "trending" };
  state.tab = "browse";
  const si = document.getElementById("search-input");
  if (si) si.value = "";
  updateTabButtons();
  fetchMovies();
}

function updateTabButtons() {
  document.getElementById("tab-browse").classList.toggle("active", state.tab === "browse");
  document.getElementById("tab-watchlist").classList.toggle("active", state.tab === "watchlist");
}
function renderNavCounts() {
  const el = document.getElementById("watch-count");
  if (el) el.textContent = state.watchlist.length;
}
function setTab(tab) {
  state.tab = tab;
  updateTabButtons();
  renderHero();
  if (tab === "browse") renderGrid();
  else if (tab === "watchlist") renderWatchlistTab();
  else if (tab === "history") renderHistoryTab();
}

function showConfigBanner(msg) {
  if (document.querySelector(".config-banner")) return;
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  const div = document.createElement("div");
  div.className = "config-banner";
  div.innerHTML = `${ICON.alert} ${escapeHtml(msg)}`;
  nav.insertAdjacentElement("afterend", div);
}

/* -------------------------------------- Hero ------------------------------------ */

function renderHero() {
  const slot = document.getElementById("hero-slot");
  const featured = state.movies[0];
  if (state.tab !== "browse" || state.source.type === "search" || !featured) { slot.innerHTML = ""; return; }
  slot.innerHTML = `
    <header class="hero">
      <div class="hero-inner">
        <div>
          <span class="eyebrow">${ICON.film} ${escapeHtml(state.heading)}</span>
          <h1 class="hero-title display">${escapeHtml(featured.title)}</h1>
          <p class="hero-sub">${escapeHtml(featured.overview || "")}</p>
          <div class="hero-meta">
            ${ratingBadge(featured.vote_average, "rating-lg")}
            <span>${ICON.calendar} ${yearOf(featured.release_date)}</span>
          </div>
          <button class="hero-cta" id="hero-cta">${ICON.ticket} View ticket</button>
        </div>
        <div class="hero-art-wrap">${posterHTML(featured.backdrop_path || featured.poster_path, featured.title, "w780", true)}</div>
      </div>
    </header>
  `;
  document.getElementById("hero-cta").addEventListener("click", () => openDetail(featured.id));
}

/* -------------------------------------- Grid ------------------------------------- */

function renderGrid() {
  const main = document.getElementById("main-content");
  const filtered = state.genreFilter === "All" ? state.movies : state.movies.filter((m) => (m.genre_ids || []).includes(Number(state.genreFilter)));
  const genreIds = new Set();
  state.movies.forEach((m) => (m.genre_ids || []).forEach((id) => genreIds.add(id)));
  const genreList = ["All", ...Array.from(genreIds).sort((a, b) => (state.genreMap[a] || "").localeCompare(state.genreMap[b] || ""))];

  main.innerHTML = `
    <div class="section-head">
      <h2 class="section-title display">${escapeHtml(state.heading)}</h2>
      <span class="result-count">${filtered.length} title${filtered.length !== 1 ? "s" : ""}</span>
    </div>
    <div class="genre-row" id="genre-row">
      ${genreList.map((g) => `<button class="genre-chip ${String(g) === String(state.genreFilter) ? "active" : ""}" data-genre="${g}">${g === "All" ? "All" : escapeHtml(state.genreMap[g] || "")}</button>`).join("")}
    </div>
    <div id="grid-slot"></div>
  `;

  document.querySelectorAll("#genre-row .genre-chip").forEach((btn) => {
    btn.addEventListener("click", () => { state.genreFilter = btn.dataset.genre; renderGrid(); });
  });

  const gridSlot = document.getElementById("grid-slot");
  if (state.loadingMovies) {
    gridSlot.innerHTML = `<div class="loading-row"><div class="spinner"></div></div>`;
    return;
  }
  if (state.listError) {
    gridSlot.innerHTML = `<div class="list-error">${ICON.alert}<p>${escapeHtml(state.listError)}</p></div>`;
    return;
  }
  if (filtered.length === 0) {
    gridSlot.innerHTML = `<div class="empty-state"><div class="display">No showings found</div><p>Try a different title or genre.</p></div>`;
    return;
  }
  gridSlot.innerHTML = `<div class="movie-grid">${filtered.map(movieCardHTML).join("")}</div>`;
  attachCardHandlers(gridSlot);
}

function movieCardHTML(m) {
  const inList = state.watchlist.some((w) => w.id === m.id);
  const genreNames = (m.genre_ids || []).slice(0, 2).map((id) => state.genreMap[id]).filter(Boolean);
  return `
    <div class="movie-card">
      <button class="poster-btn" data-open="${m.id}" aria-label="View details for ${escapeHtml(m.title)}">
        ${posterHTML(m.poster_path, m.title)}
        <span class="poster-overlay"><span class="poster-overlay-text">View ticket</span></span>
      </button>
      <button class="watchlist-pin ${inList ? "pinned" : ""}" data-toggle="${m.id}" aria-pressed="${inList}" aria-label="${inList ? "Remove from" : "Add to"} watchlist">
        ${inList ? ICON.bookmarkCheck : ICON.bookmark}
      </button>
      <div class="stub-seam"></div>
      <div class="card-stub">
        <div class="stub-row">
          <span class="stub-title">${escapeHtml(m.title)}</span>
          ${ratingBadge(m.vote_average)}
        </div>
        <div class="stub-meta"><span>${ICON.calendar} ${yearOf(m.release_date)}</span></div>
        <div class="stub-genres">${escapeHtml(genreNames.join(" · ") || "—")}</div>
      </div>
    </div>
  `;
}

function attachCardHandlers(container) {
  container.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDetail(btn.dataset.open));
  });
  container.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const movie = findMovie(btn.dataset.toggle);
      if (movie) toggleWatchlist(movie);
    });
  });
}

/* ----------------------------------- Watchlist tab -------------------------------- */

function renderWatchlistTab() {
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <div class="section-head">
      <h2 class="section-title display">Your watchlist</h2>
      <span class="result-count">${state.watchlist.length} title${state.watchlist.length !== 1 ? "s" : ""}</span>
    </div>
    ${state.watchlist.length === 0
      ? `<div class="empty-state"><div class="display">Your seat is empty</div><p>Add movies from Browse to start your watchlist.</p></div>`
      : `<div class="ticket-list">${state.watchlist.map(ticketRowHTML).join("")}</div>`}
  `;
  if (state.watchlist.length) {
    main.querySelectorAll("[data-open]").forEach((btn) => btn.addEventListener("click", () => openDetail(btn.dataset.open)));
    main.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => {
      const movie = findMovie(btn.dataset.remove);
      if (movie) toggleWatchlist(movie);
    }));
  }
}

function ticketRowHTML(m) {
  return `
    <div class="ticket-row">
      <button class="ticket-thumb" data-open="${m.id}" aria-label="View details for ${escapeHtml(m.title)}">${posterHTML(m.poster_path, m.title)}</button>
      <div class="ticket-info">
        <div class="stub-row">
          <span class="stub-title">${escapeHtml(m.title)}</span>
          ${ratingBadge(m.vote_average)}
        </div>
        <div class="stub-meta"><span>${ICON.calendar} ${yearOf(m.release_date)}</span></div>
      </div>
      <button class="ticket-remove" data-remove="${m.id}" aria-label="Remove ${escapeHtml(m.title)} from watchlist">${ICON.x}</button>
    </div>
  `;
}

/* ------------------------------------ History tab ---------------------------------- */

function renderHistoryTab() {
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <div class="section-head">
      <h2 class="section-title display">Browse history</h2>
      <span class="result-count">${state.history.length} title${state.history.length !== 1 ? "s" : ""}</span>
    </div>
    ${state.history.length ? `<div class="history-actions"><button class="clear-history-btn" id="clear-history-btn">${ICON.x} Clear history</button></div>` : ""}
    ${state.history.length === 0
      ? `<div class="empty-state"><div class="display">No history yet</div><p>Titles you open will show up here.</p></div>`
      : `<div class="ticket-list">${state.history.map(historyRowHTML).join("")}</div>`}
  `;
  if (state.history.length) {
    document.getElementById("clear-history-btn").addEventListener("click", clearHistory);
    main.querySelectorAll("[data-open]").forEach((btn) => btn.addEventListener("click", () => openDetail(btn.dataset.open)));
    main.querySelectorAll("[data-remove-history]").forEach((btn) => btn.addEventListener("click", () => removeHistoryItem(Number(btn.dataset.removeHistory))));
  }
}
function historyRowHTML(m) {
  return `
    <div class="ticket-row">
      <button class="ticket-thumb" data-open="${m.id}" aria-label="View details for ${escapeHtml(m.title)}">${posterHTML(m.poster_path, m.title)}</button>
      <div class="ticket-info">
        <div class="stub-row">
          <span class="stub-title">${escapeHtml(m.title)}</span>
          ${ratingBadge(m.vote_average)}
        </div>
        <div class="stub-meta"><span>${ICON.calendar} ${yearOf(m.release_date)}</span></div>
      </div>
      <button class="ticket-remove" data-remove-history="${m.id}" aria-label="Remove from history">${ICON.x}</button>
    </div>
  `;
}

/* ------------------------------------ Mega menu ------------------------------------ */

function openMenu() {
  if (document.getElementById("menu-overlay")) return;
  const genresSorted = Object.entries(state.genreMap).sort((a, b) => a[1].localeCompare(b[1]));
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";
  overlay.id = "menu-overlay";
  overlay.innerHTML = `
    <div class="menu-top">
      <div class="logo display">${ICON.film}REEL<span>IST</span></div>
      <button class="menu-close" id="menu-close-btn" aria-label="Close menu">${ICON.x}</button>
    </div>
    <div class="menu-columns">
      <div>
        <div class="menu-col-title">${ICON.film} Browse</div>
        <div class="menu-link-list" id="menu-quicklinks">
          ${QUICK_LISTS.map((q) => `<button class="menu-link" data-list="${q.key}">${escapeHtml(q.label)}</button>`).join("")}
        </div>
      </div>
      <div>
        <div class="menu-col-title">${ICON.ticket} Genres</div>
        <div class="menu-genre-grid" id="menu-genres">
          ${genresSorted.map(([id, name]) => `<button class="genre-chip" data-genre-id="${id}" data-genre-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("") || `<span class="menu-account-note">Loading genres…</span>`}
        </div>
      </div>
      <div>
        <div class="menu-col-title">${ICON.user} Account</div>
        <div id="menu-account-slot"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById("menu-close-btn").addEventListener("click", closeMenu);
  overlay.querySelectorAll("[data-list]").forEach((btn) => btn.addEventListener("click", () => {
    state.source = { type: "list", key: btn.dataset.list };
    state.tab = "browse";
    const si = document.getElementById("search-input"); if (si) si.value = "";
    updateTabButtons(); closeMenu(); fetchMovies();
  }));
  overlay.querySelectorAll("[data-genre-id]").forEach((btn) => btn.addEventListener("click", () => {
    state.source = { type: "genre", id: Number(btn.dataset.genreId), name: btn.dataset.genreName };
    state.tab = "browse";
    const si = document.getElementById("search-input"); if (si) si.value = "";
    updateTabButtons(); closeMenu(); fetchMovies();
  }));
  renderMenuAccountSlot();
}
function closeMenu() {
  const o = document.getElementById("menu-overlay");
  if (o) o.remove();
}

function renderMenuAccountSlot() {
  const slot = document.getElementById("menu-account-slot");
  if (!slot) return;
  if (!FIREBASE_ENABLED) {
    slot.innerHTML = `<p class="menu-account-note">Sign-in isn't set up yet. Add a Firebase project to config.js to let people save their watchlist to their Google account.</p>`;
    return;
  }
  if (state.user) {
    slot.innerHTML = `
      <div class="menu-link-list">
        <span style="color:var(--spotlight);font-weight:700;font-size:14px;">${escapeHtml(state.user.name || state.user.email || "Account")}</span>
        <button class="menu-link" id="menu-history-link">Browse history</button>
        <button class="menu-link" id="menu-signout-link">Sign out</button>
      </div>`;
    document.getElementById("menu-history-link").addEventListener("click", () => { state.tab = "history"; updateTabButtons(); renderHero(); renderHistoryTab(); closeMenu(); });
    document.getElementById("menu-signout-link").addEventListener("click", () => { signOutUser(); closeMenu(); });
  } else {
    slot.innerHTML = `<button class="hero-cta" id="menu-signin-link">${ICON.user} Sign in with Google</button>`;
    document.getElementById("menu-signin-link").addEventListener("click", signInGoogle);
  }
}

/* ---------------------------------- Account dropdown -------------------------------- */

function renderAccountWrap() {
  const wrap = document.getElementById("account-wrap");
  if (!wrap) return;
  if (!FIREBASE_ENABLED) {
    wrap.innerHTML = `<button class="icon-btn" id="account-btn" title="Sign-in not configured — see config.js" aria-label="Account">${ICON.user}</button>`;
    document.getElementById("account-btn").addEventListener("click", openMenu);
    return;
  }
  if (state.user) {
    const initial = (state.user.name || state.user.email || "?").charAt(0).toUpperCase();
    wrap.innerHTML = `
      <button class="account-btn" id="account-btn">
        <span class="avatar-circle">${state.user.photoURL ? `<img src="${state.user.photoURL}" alt="" />` : initial}</span>
        ${escapeHtml((state.user.name || "Account").split(" ")[0])}
      </button>`;
  } else {
    wrap.innerHTML = `<button class="account-btn" id="account-btn">${ICON.user} Sign in</button>`;
  }
  document.getElementById("account-btn").addEventListener("click", toggleAccountDropdown);
}

function toggleAccountDropdown() {
  const existing = document.getElementById("account-dropdown");
  if (existing) { existing.remove(); document.removeEventListener("click", outsideCloseAccount); return; }
  const wrap = document.getElementById("account-wrap");
  const dd = document.createElement("div");
  dd.className = "account-dropdown";
  dd.id = "account-dropdown";
  if (state.user) {
    const initial = (state.user.name || state.user.email || "?").charAt(0).toUpperCase();
    dd.innerHTML = `
      <div class="account-user-row">
        <span class="avatar-circle">${state.user.photoURL ? `<img src="${state.user.photoURL}" alt="" />` : initial}</span>
        <div>
          <div class="account-user-name">${escapeHtml(state.user.name || "Account")}</div>
          <div class="account-user-email">${escapeHtml(state.user.email || "")}</div>
        </div>
      </div>
      <button class="account-item" id="dd-watchlist">${ICON.ticket} Watchlist</button>
      <button class="account-item" id="dd-history">${ICON.clock} Browse history</button>
      <button class="account-item" id="dd-signout">${ICON.logout} Sign out</button>
    `;
  } else {
    dd.innerHTML = `
      <button class="account-item" id="dd-signin">${ICON.user} Sign in with Google</button>
      <p class="account-note">Save your watchlist and browse history to your Google account.</p>
    `;
  }
  wrap.appendChild(dd);
  setTimeout(() => document.addEventListener("click", outsideCloseAccount), 0);
  if (state.user) {
    document.getElementById("dd-watchlist").addEventListener("click", () => { state.tab = "watchlist"; updateTabButtons(); renderHero(); renderWatchlistTab(); closeAccountDropdown(); });
    document.getElementById("dd-history").addEventListener("click", () => { state.tab = "history"; updateTabButtons(); renderHero(); renderHistoryTab(); closeAccountDropdown(); });
    document.getElementById("dd-signout").addEventListener("click", () => { signOutUser(); closeAccountDropdown(); });
  } else {
    document.getElementById("dd-signin").addEventListener("click", () => { signInGoogle(); closeAccountDropdown(); });
  }
}
function closeAccountDropdown() {
  const dd = document.getElementById("account-dropdown");
  if (dd) dd.remove();
  document.removeEventListener("click", outsideCloseAccount);
}
function outsideCloseAccount(e) {
  const wrap = document.getElementById("account-wrap");
  if (wrap && !wrap.contains(e.target)) closeAccountDropdown();
}

/* ------------------------------------ Detail panel --------------------------------- */

async function openDetail(id) {
  id = Number(id);
  state.selectedMovieId = id;
  const scrim = document.createElement("div");
  scrim.className = "detail-scrim";
  scrim.innerHTML = `
    <div class="detail-panel" role="dialog" aria-modal="true">
      <button class="detail-close" aria-label="Close details">${ICON.x}</button>
      <div class="detail-loading"><div class="spinner"></div></div>
    </div>
  `;
  document.body.appendChild(scrim);
  scrim.addEventListener("click", (e) => { if (e.target === scrim) closeDetail(); });
  scrim.querySelector(".detail-close").addEventListener("click", closeDetail);

  try {
    const [detail, images] = await Promise.all([
      tmdb(`/movie/${id}`, { append_to_response: "credits" }),
      tmdb(`/movie/${id}/images`, { include_image_language: "en,null" }),
    ]);
    state.detailCache = detail;
    addHistory(detail);
    const wallpapers = (images.backdrops || []).slice(0, 3);
    renderDetailContent(scrim, detail, wallpapers);
  } catch (err) {
    scrim.querySelector(".detail-panel").innerHTML = `
      <button class="detail-close" aria-label="Close details">${ICON.x}</button>
      <div class="detail-loading">${ICON.alert}<p>${escapeHtml(err.message)}</p></div>
    `;
    scrim.querySelector(".detail-close").addEventListener("click", closeDetail);
  }
}

function renderDetailContent(scrim, detail, wallpapers) {
  const inList = state.watchlist.some((w) => w.id === detail.id);
  const director = (detail.credits?.crew || []).filter((c) => c.job === "Director").map((c) => c.name).join(", ") || "—";
  const cast = (detail.credits?.cast || []).slice(0, 5).map((c) => c.name).join(", ") || "—";
  const panel = scrim.querySelector(".detail-panel");
  panel.innerHTML = `
    <button class="detail-close" aria-label="Close details">${ICON.x}</button>
    <div class="detail-backdrop">
      ${posterHTML(detail.backdrop_path || detail.poster_path, detail.title, "w780", true)}
      <div class="detail-backdrop-fade"></div>
      <div class="detail-backdrop-content">
        <span class="eyebrow">${ICON.film} Now showing</span>
        <h2 class="detail-title display">${escapeHtml(detail.title)}</h2>
        <div class="detail-meta-row">
          ${ratingBadge(detail.vote_average, "rating-lg")}
          <span>${yearOf(detail.release_date)}</span>
          ${detail.runtime ? `<span>${detail.runtime} min</span>` : ""}
        </div>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-genres">${(detail.genres || []).map((g) => `<span class="chip">${escapeHtml(g.name)}</span>`).join("")}</div>
      <p class="detail-synopsis">${escapeHtml(detail.overview || "No synopsis available.")}</p>
      <div class="detail-credits">
        <div><span class="credit-label">Director</span><span class="credit-value">${escapeHtml(director)}</span></div>
        <div><span class="credit-label">Cast</span><span class="credit-value">${escapeHtml(cast)}</span></div>
      </div>
      <button class="watchlist-btn ${inList ? "in-list" : ""}" id="detail-watchlist-btn">
        ${inList ? ICON.bookmarkCheck : ICON.bookmark} ${inList ? "On your watchlist" : "Add to watchlist"}
      </button>
      ${wallpapers.length ? `
        <div class="wallpaper-section">
          <span class="credit-label">Wallpapers</span>
          <div class="wallpaper-row">
            ${wallpapers.map((w) => `<a class="wallpaper-tile" href="${imgUrl(w.file_path, "original")}" target="_blank" rel="noreferrer"><img class="poster-img" src="${imgUrl(w.file_path, "w500")}" alt="${escapeHtml(detail.title)} wallpaper" loading="lazy" /></a>`).join("")}
          </div>
        </div>` : ""}
    </div>
  `;
  panel.querySelector(".detail-close").addEventListener("click", closeDetail);
  document.getElementById("detail-watchlist-btn").addEventListener("click", () => {
    toggleWatchlist(detail);
    const btn = document.getElementById("detail-watchlist-btn");
    const nowIn = state.watchlist.some((w) => w.id === detail.id);
    btn.classList.toggle("in-list", nowIn);
    btn.innerHTML = `${nowIn ? ICON.bookmarkCheck : ICON.bookmark} ${nowIn ? "On your watchlist" : "Add to watchlist"}`;
  });
}

function closeDetail() {
  const scrim = document.querySelector(".detail-scrim");
  if (scrim) scrim.remove();
  state.selectedMovieId = null;
}

/* -------------------------------------- Data fetching ------------------------------ */

async function fetchGenres() {
  try {
    const d = await tmdb("/genre/movie/list");
    const map = {};
    (d.genres || []).forEach((g) => { map[g.id] = g.name; });
    state.genreMap = map;
  } catch (e) { /* non-fatal */ }
}

function buildSourceRequest() {
  const s = state.source;
  if (s.type === "search") return { path: "/search/movie", params: { query: s.query, include_adult: "false" }, heading: `Results for "${s.query}"` };
  if (s.type === "genre") return { path: "/discover/movie", params: { with_genres: s.id, sort_by: "popularity.desc" }, heading: s.name };
  if (s.type === "list") {
    const item = QUICK_LISTS.find((q) => q.key === s.key) || QUICK_LISTS[0];
    return { path: item.path, params: item.params, heading: item.label };
  }
  return { path: "/trending/movie/week", params: {}, heading: "Trending this week" };
}

async function fetchMovies() {
  state.loadingMovies = true;
  state.listError = null;
  if (state.tab === "browse") renderGrid();
  const req = buildSourceRequest();
  try {
    const d = await tmdb(req.path, req.params);
    state.movies = d.results || [];
    state.heading = req.heading;
    state.genreFilter = "All";
    state.loadingMovies = false;
    if (state.tab === "browse") { renderHero(); renderGrid(); }
  } catch (err) {
    state.listError = err.message;
    state.loadingMovies = false;
    if (state.tab === "browse") renderGrid();
  }
}

/* -------------------------------------- Firebase (optional) ------------------------ */

let auth = null, db = null, cloudSaveTimer = null;

function initFirebase() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged(onAuthChange);
  } catch (e) { console.error("Firebase init failed", e); }
}

function signInGoogle() {
  if (!FIREBASE_ENABLED || !auth) { alert("Google sign-in isn't configured yet. Add your Firebase project keys to config.js (see README.md)."); return; }
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => { console.error(err); alert("Sign-in failed: " + err.message); });
}
function signOutUser() { if (auth) auth.signOut(); }

async function onAuthChange(user) {
  if (user) {
    state.user = { uid: user.uid, name: user.displayName, email: user.email, photoURL: user.photoURL };
    await loadCloudData(user.uid);
  } else {
    state.user = null;
  }
  renderAccountWrap();
  renderNavCounts();
  if (state.tab === "browse") renderGrid();
  if (state.tab === "watchlist") renderWatchlistTab();
  if (state.tab === "history") renderHistoryTab();
}

async function loadCloudData(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      state.watchlist = data.watchlist || [];
      state.history = data.history || [];
      localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(state.watchlist));
      localStorage.setItem(HISTORY_STORAGE, JSON.stringify(state.history));
    } else {
      await db.collection("users").doc(uid).set({ watchlist: state.watchlist, history: state.history, updatedAt: Date.now() }, { merge: true });
    }
  } catch (e) { console.error("Failed to load cloud data", e); }
}

function scheduleCloudSave() {
  if (!state.user || !db) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    db.collection("users").doc(state.user.uid).set({ watchlist: state.watchlist, history: state.history, updatedAt: Date.now() }, { merge: true }).catch((e) => console.error("Cloud save failed", e));
  }, 800);
}

/* -------------------------------------- Init -------------------------------------- */

(async function start() {
  renderShell();
  renderAccountWrap();
  if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY") {
    showConfigBanner("Add your TMDB API key in config.js to load movies.");
  }
  await fetchGenres();
  await fetchMovies();
  if (FIREBASE_ENABLED && typeof firebase !== "undefined") initFirebase();
})();
