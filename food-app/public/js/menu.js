import { state } from "./config.js";
import { fid } from "./utils.js";

function getToday() { return new Date().toISOString().slice(0, 10); }

function getHistory() {
  const h = JSON.parse(localStorage.getItem("menuHistory") || "{}");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cs = cutoff.toISOString().slice(0, 10);
  for (const d of Object.keys(h)) if (d < cs) delete h[d];
  localStorage.setItem("menuHistory", JSON.stringify(h));
  return h;
}

export function addToHistory(f) {
  const h = getHistory(), t = getToday();
  if (!h[t]) h[t] = [];
  if (!h[t].some(m => fid(m) === fid(f))) h[t].push(f);
  localStorage.setItem("menuHistory", JSON.stringify(h));
}

export function saveMenu() {
  localStorage.setItem("todayMenu", JSON.stringify(state.todayMenu));
  updateMenuCount();
}

export function updateMenuCount() {
  const el = document.getElementById("menu-count");
  if (state.todayMenu.length) { el.style.display = "inline"; el.textContent = state.todayMenu.length; }
  else el.style.display = "none";
}

export function renderMenu() {
  const el = document.getElementById("menu-list");
  if (!state.todayMenu.length) {
    el.innerHTML = '<p class="menu-empty">Chưa có món nào.</p>';
    return;
  }
  el.innerHTML = state.todayMenu.map(m => `
    <div class="menu-item">
      <div class="info"><h3>${m.name}</h3><div class="ingredients">${m.ingredients.join(", ")}</div></div>
      <div class="actions">
        <button class="btn-secondary btn" onclick="window._viewFood('${fid(m)}')">Cách nấu</button>
        <button class="btn-danger btn" onclick="window._removeFromMenu('${fid(m)}')">Xoá</button>
      </div>
    </div>`).join("");
}

export function removeFromMenu(id) {
  state.todayMenu = state.todayMenu.filter(m => fid(m) !== id);
  saveMenu();
  renderMenu();
}

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function renderHistory() {
  const el = document.getElementById("history-list");
  const h = getHistory();
  const days = Object.keys(h).sort((a, b) => b.localeCompare(a));
  if (!days.length) { el.innerHTML = '<p class="menu-empty">Chưa có lịch sử.</p>'; return; }
  el.innerHTML = days.map(d => {
    const date = new Date(d + "T00:00:00");
    const label = d === getToday() ? "Hôm nay" : DAY_NAMES[date.getDay()];
    const items = h[d];
    return `<div class="history-day">
      <div class="day-header"><span>${label}</span><span class="day-date">${d} · ${items.length} món</span></div>
      <div class="day-items">${items.map(m => `
        <div class="day-item"><span>${m.name}</span><span style="color:#666;font-size:0.8rem">⏱${m.cookTime}p</span>
        <button onclick="window._viewFood('${fid(m)}')">Cách nấu</button></div>`).join("")}
      </div></div>`;
  }).join("");
}
