import { state } from "./config.js";
import { authHeaders, renderCard } from "./utils.js";

let fridgeItems = [];

export async function loadFridge() {
  if (!state.currentUser) {
    document.getElementById("fridge-list").innerHTML = '<p class="menu-empty">Đăng nhập để sử dụng tủ lạnh</p>';
    document.getElementById("fridge-count").textContent = "";
    document.getElementById("fridge-suggest-btn").style.display = "none";
    return;
  }
  try {
    const r = await fetch("/api/fridge", { headers: authHeaders() });
    fridgeItems = await r.json();
  } catch (e) { fridgeItems = []; }
  renderFridge();
}

function renderFridge() {
  const el = document.getElementById("fridge-list");
  const countEl = document.getElementById("fridge-count");
  const sugBtn = document.getElementById("fridge-suggest-btn");
  countEl.textContent = `${fridgeItems.length} nguyên liệu trong tủ lạnh`;
  sugBtn.style.display = fridgeItems.length ? "block" : "none";
  if (!fridgeItems.length) {
    el.innerHTML = '<p class="menu-empty">Tủ lạnh trống. Thêm nguyên liệu sau khi đi chợ nhé!</p>';
    return;
  }
  el.innerHTML = '<div class="fridge-grid">' + fridgeItems.map(item => `
    <div class="fridge-item">
      <div class="fridge-info">
        <span class="fridge-item-name">${item.name}</span>
        ${item.quantity ? `<span class="fridge-item-qty">${item.quantity}</span>` : ""}
      </div>
      <div class="fridge-actions">
        <button class="btn btn-danger" onclick="window._removeFridgeItem('${item._id}')">Xoá</button>
      </div>
    </div>`).join("") + '</div>';
}

export async function addFridgeItem() {
  const nameInput = document.getElementById("fridge-name");
  const qtyInput = document.getElementById("fridge-qty");
  const raw = nameInput.value.trim();
  const qty = qtyInput.value.trim();
  if (!raw) return;
  const names = raw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const items = names.map(n => ({ name: n, quantity: names.length === 1 ? qty : "" }));
  await fetch("/api/fridge", { method: "POST", headers: authHeaders(), body: JSON.stringify({ items }) });
  nameInput.value = "";
  qtyInput.value = "";
  loadFridge();
}

export async function removeFridgeItem(id) {
  await fetch("/api/fridge/" + id, { method: "DELETE", headers: authHeaders() });
  loadFridge();
}

export async function suggestFromFridge() {
  const q = fridgeItems.map(i => i.name).join(",");
  const r = await fetch("/api/search?q=" + encodeURIComponent(q));
  const results = await r.json();
  const el = document.getElementById("fridge-suggest-result");
  if (!results.length) {
    el.innerHTML = '<p style="color:#888;text-align:center;margin-top:16px">Không tìm thấy món phù hợp</p>';
    return;
  }
  el.innerHTML = '<h2 class="section-title" style="margin-top:24px">Món có thể nấu</h2><div class="section-divider"></div><div class="card-grid">' +
    results.slice(0, 8).map(m => renderCard(m)).join("") + '</div>';
}

export function initFridge() {
  document.getElementById("fridge-name").addEventListener("keydown", e => {
    if (e.key === "Enter") addFridgeItem();
  });
}
