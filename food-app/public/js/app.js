const DEFAULT_IMG = "/img/default-food.svg";
const SUGGEST_LABELS = ["🥩 Món mặn", "🥬 Món rau", "🍲 Canh / Kèm"];
const REGION_NAMES = { "bắc": "Miền Bắc", "trung": "Miền Trung", "nam": "Miền Nam" };
const PAGE_IDS = ["suggest", "search", "region", "menu", "history", "fridge", "admin"];
const ADM_PER_PAGE = 8;
const LIST_PER_PAGE = 8;

let todayMenu = JSON.parse(localStorage.getItem("todayMenu") || "[]");
let pendingFood = null;
let allFoods = [];
let editingId = null;
let uploadedImageUrl = "";
let admPage = 1;
let admFiltered = [];
let regionItems = [];
let regionPage = 1;
let searchItems = [];
let searchPage = 1;

function fid(f) { return f._id || f.id; }

// ========== Utils ==========
function getToday() { return new Date().toISOString().slice(0, 10); }
function getHistory() {
  const h = JSON.parse(localStorage.getItem("menuHistory") || "{}");
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const cs = cutoff.toISOString().slice(0, 10);
  for (const d of Object.keys(h)) if (d < cs) delete h[d];
  localStorage.setItem("menuHistory", JSON.stringify(h)); return h;
}
function addToHistory(f) {
  const h = getHistory(), t = getToday();
  if (!h[t]) h[t] = [];
  if (!h[t].some(m => fid(m) === fid(f))) h[t].push(f);
  localStorage.setItem("menuHistory", JSON.stringify(h));
}
function saveMenu() { localStorage.setItem("todayMenu", JSON.stringify(todayMenu)); updateMenuCount(); }
function updateMenuCount() {
  const el = document.getElementById("menu-count");
  if (todayMenu.length) { el.style.display = "inline"; el.textContent = todayMenu.length; } else el.style.display = "none";
}
function foodImg(m) { return m.image || DEFAULT_IMG; }

// ========== Card rendering ==========
function renderCard(m, label) {
  return `<div class="card" onclick="onCardClick('${fid(m)}')">
    <img class="card-img" src="${foodImg(m)}" alt="" onerror="this.src='${DEFAULT_IMG}'">
    <div class="card-body">
    ${label ? `<div class="label">${label}</div>` : ""}
    <h3>${m.name}</h3>
    <div class="ingredients">${m.ingredients.join(", ")}</div>
    <div class="meta">${m.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    <div class="time">⏱ ${m.cookTime} phút</div>
    ${m.region ? `<span class="region-badge">${REGION_NAMES[m.region] || m.region}</span>` : ""}
    </div></div>`;
}

// ========== Menu popup ==========
function onCardClick(id) {
  const f = allFoods.find(x => fid(x) === id);
  if (!f) return;
  if (todayMenu.some(m => fid(m) === fid(f))) { alert("Đã có trong thực đơn!"); return; }
  pendingFood = f;
  document.getElementById("popup-title").textContent = f.name;
  document.getElementById("add-overlay").classList.add("show");
}
function closeAddPopup() { document.getElementById("add-overlay").classList.remove("show"); pendingFood = null; }
function confirmAdd() {
  if (pendingFood) { todayMenu.push(pendingFood); saveMenu(); addToHistory(pendingFood); }
  closeAddPopup();
}
function removeFromMenu(id) { todayMenu = todayMenu.filter(m => fid(m) !== id); saveMenu(); renderMenu(); }

// ========== Cook popup ==========
function showCook(f) {
  document.getElementById("cook-detail").innerHTML = `
    <img class="cook-img" src="${foodImg(f)}" alt="" onerror="this.src='${DEFAULT_IMG}'">
    <div class="cook-body">
      <h3>${f.name}</h3>
      <div class="detail-row"><div class="detail-label">Nguyên liệu</div><div>${f.ingredients.join(", ")}</div></div>
      <div class="detail-row"><div class="detail-label">Thời gian</div><div>⏱ ${f.cookTime} phút</div></div>
      <div class="detail-row"><div class="detail-label">Các bước</div><ol class="step-list">${f.steps.map(s => `<li>${s}</li>`).join("")}</ol></div>
      <button class="btn btn-ghost" onclick="closeCookPopup()" style="margin-top:16px">Đóng</button>
    </div>`;
  document.getElementById("cook-overlay").classList.add("show");
}
function closeCookPopup() { document.getElementById("cook-overlay").classList.remove("show"); }

// ========== Today menu ==========
function renderMenu() {
  const el = document.getElementById("menu-list");
  if (!todayMenu.length) { el.innerHTML = '<p class="menu-empty">Chưa có món nào.</p>'; return; }
  el.innerHTML = todayMenu.map(m => `
    <div class="menu-item">
      <div class="info"><h3>${m.name}</h3><div class="ingredients">${m.ingredients.join(", ")}</div></div>
      <div class="actions">
        <button class="btn-secondary btn" onclick="viewFood('${fid(m)}')">Cách nấu</button>
        <button class="btn-danger btn" onclick="removeFromMenu('${fid(m)}')">Xoá</button>
      </div>
    </div>`).join("");
}

// ========== Navigation ==========
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const btns = document.querySelectorAll("#nav-tabs button");
  btns.forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  PAGE_IDS.forEach((n, i) => { if (n === id) btns[i].classList.add("active"); });
  if (id === "menu") renderMenu();
  if (id === "history") renderHistory();
  if (id === "fridge") loadFridge();
  if (id === "admin") loadAdmin();
}

// ========== History ==========
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
function renderHistory() {
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
        <button onclick="viewFood('${fid(m)}')">Cách nấu</button></div>`).join("")}
      </div></div>`;
  }).join("");
}

// ========== Suggest / Search / Region ==========
async function suggest() {
  const r = await fetch("/api/suggest"); const d = await r.json();
  document.getElementById("suggest-result").innerHTML = d.map((m, i) => renderCard(m, SUGGEST_LABELS[i])).join("");
}
async function searchFood() {
  const q = document.getElementById("search-input").value.trim(); if (!q) return;
  const r = await fetch("/api/search?q=" + encodeURIComponent(q)); const results = await r.json();
  const el = document.getElementById("search-result");
  if (!results.length) { el.innerHTML = '<p style="color:#888">Không tìm thấy</p>'; document.getElementById("search-paging").innerHTML = ""; return; }
  searchItems = results; searchPage = 1; renderSearchPage();
}
function renderSearchPage() {
  const total = searchItems.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PER_PAGE));
  if (searchPage > totalPages) searchPage = totalPages;
  const start = (searchPage - 1) * LIST_PER_PAGE;
  const items = searchItems.slice(start, start + LIST_PER_PAGE);
  document.getElementById("search-count").textContent = `${total} kết quả · Trang ${searchPage}/${totalPages}`;
  document.getElementById("search-result").innerHTML = items.map(m => renderCard(m)).join("");
  document.getElementById("search-paging").innerHTML = totalPages > 1 ? renderPaging(searchPage, totalPages, "goSearchPage") : "";
}
function goSearchPage(pg) { searchPage = pg; renderSearchPage(); }
document.getElementById("search-input").addEventListener("keydown", e => { if (e.key === "Enter") searchFood(); });

function renderPaging(page, totalPages, goFn) {
  let p = `<button ${page <= 1 ? "disabled" : ""} onclick="${goFn}(${page - 1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== totalPages) { if (i === 2 || i === totalPages - 1) p += '<button disabled>…</button>'; continue; }
    p += `<button class="${i === page ? 'active' : ''}" onclick="${goFn}(${i})">${i}</button>`;
  }
  p += `<button ${page >= totalPages ? "disabled" : ""} onclick="${goFn}(${page + 1})">›</button>`;
  return p;
}

async function loadRegion(region, btn) {
  document.querySelectorAll("#region-tabs button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const r = await fetch("/api/region/" + encodeURIComponent(region)); regionItems = await r.json();
  regionPage = 1; renderRegionPage();
}
function renderRegionPage() {
  const total = regionItems.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PER_PAGE));
  if (regionPage > totalPages) regionPage = totalPages;
  const start = (regionPage - 1) * LIST_PER_PAGE;
  const items = regionItems.slice(start, start + LIST_PER_PAGE);
  document.getElementById("region-count").textContent = `${total} món · Trang ${regionPage}/${totalPages}`;
  document.getElementById("region-result").innerHTML = items.map(m => renderCard(m)).join("");
  document.getElementById("region-paging").innerHTML = totalPages > 1 ? renderPaging(regionPage, totalPages, "goRegionPage") : "";
}
function goRegionPage(pg) { regionPage = pg; renderRegionPage(); }

// ========== Admin ==========
async function loadAdmin() {
  document.getElementById("adm-loading").style.display = "block";
  document.getElementById("adm-grid").innerHTML = "";
  document.getElementById("adm-paging").innerHTML = "";
  try { const r = await fetch("/api/foods"); const data = await r.json(); allFoods = Array.isArray(data) ? data : []; }
  catch (e) { allFoods = []; }
  admPage = 1; applyAdmFilter();
}
function filterAdmin() {
  document.getElementById("adm-loading").style.display = "block";
  document.getElementById("adm-grid").innerHTML = "";
  admPage = 1; requestAnimationFrame(() => applyAdmFilter());
}
function applyAdmFilter() {
  const q = document.getElementById("adm-search").value.toLowerCase().trim();
  const rg = document.getElementById("adm-region").value;
  const tp = document.getElementById("adm-type").value;
  let list = allFoods;
  if (q) { const kws = q.split(/[,，]/).map(s => s.trim()).filter(Boolean); list = list.filter(f => kws.some(kw => f.name.toLowerCase().includes(kw) || f.ingredients.some(i => i.toLowerCase().includes(kw)))); }
  if (rg) list = list.filter(f => f.region === rg);
  if (tp) { if (tp === "thịt") list = list.filter(f => f.nutrition.some(n => ["protein","fat","iron","omega3"].includes(n)) && !f.tags.includes("canh") && !f.tags.includes("rau") && !f.tags.includes("kèm") && !f.tags.includes("nộm")); else list = list.filter(f => f.tags.includes(tp)); }
  admFiltered = list; renderAdmPage();
}
function renderAdmPage() {
  const total = admFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADM_PER_PAGE));
  if (admPage > totalPages) admPage = totalPages;
  const start = (admPage - 1) * ADM_PER_PAGE;
  const items = admFiltered.slice(start, start + ADM_PER_PAGE);
  document.getElementById("adm-count").textContent = `${total} món · Trang ${admPage}/${totalPages}`;
  document.getElementById("adm-grid").innerHTML = items.map(f => `
    <div class="admin-card">
      <img src="${foodImg(f)}" alt="" onerror="this.src='${DEFAULT_IMG}'">
      <div class="admin-card-body">
        <h4>${f.name}</h4>
        <div class="ameta">${REGION_NAMES[f.region] || ""} · ⏱${f.cookTime}p</div>
        <div class="abtns">
          <button class="btn-secondary btn" onclick="viewFood('${fid(f)}')">Xem</button>
          <button class="btn-secondary btn" onclick="editFood('${fid(f)}')">Sửa</button>
          <button class="btn-danger btn" onclick="deleteFood('${fid(f)}')">Xoá</button>
        </div>
      </div>
    </div>`).join("");
  let p = `<button ${admPage <= 1 ? "disabled" : ""} onclick="goAdmPage(${admPage - 1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - admPage) > 2 && i !== 1 && i !== totalPages) { if (i === 2 || i === totalPages - 1) p += '<button disabled>…</button>'; continue; }
    p += `<button class="${i === admPage ? 'active' : ''}" onclick="goAdmPage(${i})">${i}</button>`;
  }
  p += `<button ${admPage >= totalPages ? "disabled" : ""} onclick="goAdmPage(${admPage + 1})">›</button>`;
  document.getElementById("adm-paging").innerHTML = p;
  document.getElementById("adm-loading").style.display = "none";
}
function goAdmPage(pg) { admPage = pg; document.getElementById("adm-loading").style.display = "block"; document.getElementById("adm-grid").innerHTML = ""; requestAnimationFrame(() => renderAdmPage()); }
document.getElementById("adm-search").addEventListener("keydown", e => { if (e.key === "Enter") { filterAdmin(); hideAdmSuggest(); } });
document.getElementById("adm-region").addEventListener("change", filterAdmin);
document.getElementById("adm-type").addEventListener("change", filterAdmin);

// ========== Admin suggest dropdown ==========
function onAdmInput() {
  const q = document.getElementById("adm-search").value.toLowerCase().trim();
  const dd = document.getElementById("adm-suggest");
  if (!q) { dd.classList.remove("show"); return; }
  const matches = allFoods.filter(f => f.name.toLowerCase().includes(q) || f.ingredients.some(i => i.toLowerCase().includes(q))).slice(0, 8);
  if (!matches.length) { dd.classList.remove("show"); return; }
  dd.innerHTML = matches.map(f => `<div class="sg-item" onclick="pickSuggest('${fid(f)}')"><div class="sg-name">${f.name}</div><div class="sg-ing">${f.ingredients.join(", ")}</div></div>`).join("");
  dd.classList.add("show");
}
function pickSuggest(id) { const f = allFoods.find(x => fid(x) === id); if (f) { document.getElementById("adm-search").value = f.name; hideAdmSuggest(); filterAdmin(); } }
function hideAdmSuggest() { document.getElementById("adm-suggest").classList.remove("show"); }
document.addEventListener("click", e => { if (!e.target.closest(".search-wrap")) hideAdmSuggest(); });

// ========== Food form ==========
function openFoodForm(food) {
  editingId = food ? fid(food) : null;
  uploadedImageUrl = food ? (food.image || "") : "";
  const f = food || {};
  document.getElementById("food-form").innerHTML = `
    <h3>${food ? "Sửa món ăn" : "Thêm món mới"}</h3>
    <label>Tên món *</label><input id="ff-name" value="${f.name || ""}" placeholder="VD: Thịt kho tàu">
    <div class="err" id="ff-name-err">Tên món đã tồn tại!</div>
    <label>Nguyên liệu (phẩy) *</label><input id="ff-ing" value="${f.ingredients ? f.ingredients.join(", ") : ""}" placeholder="thịt ba chỉ, trứng cút">
    <label>Tags (phẩy)</label><input id="ff-tags" value="${f.tags ? f.tags.join(", ") : ""}" placeholder="mặn, truyền thống">
    <label>Dinh dưỡng (phẩy)</label><input id="ff-nut" value="${f.nutrition ? f.nutrition.join(", ") : ""}" placeholder="protein, fat">
    <label>Vùng miền</label>
    <select id="ff-region"><option value="bắc" ${f.region === "bắc" ? "selected" : ""}>Miền Bắc</option><option value="trung" ${f.region === "trung" ? "selected" : ""}>Miền Trung</option><option value="nam" ${f.region === "nam" ? "selected" : ""}>Miền Nam</option></select>
    <label>Món chay?</label>
    <select id="ff-veg"><option value="false" ${f.isVegetarian ? "" : "selected"}>Không</option><option value="true" ${f.isVegetarian ? "selected" : ""}>Có</option></select>
    <label>Thời gian nấu (phút)</label><input id="ff-time" type="number" value="${f.cookTime || 20}" min="1">
    <label>Các bước nấu (mỗi dòng 1 bước)</label><textarea id="ff-steps" placeholder="Bước 1&#10;Bước 2">${f.steps ? f.steps.join("\n") : ""}</textarea>
    <label>Ảnh mô tả</label><input type="file" id="ff-image" accept="image/*" onchange="previewImg(this)">
    ${uploadedImageUrl ? `<img class="img-preview" id="ff-preview" src="${uploadedImageUrl}">` : '<img class="img-preview" id="ff-preview" style="display:none">'}
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeFoodForm()">Huỷ</button><button class="btn btn-primary" onclick="saveFoodForm()">Lưu</button></div>`;
  document.getElementById("form-overlay").classList.add("show");
}
function closeFoodForm() { document.getElementById("form-overlay").classList.remove("show"); editingId = null; uploadedImageUrl = ""; }
function previewImg(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => { const i = document.getElementById("ff-preview"); i.src = e.target.result; i.style.display = "block"; uploadedImageUrl = e.target.result; };
  r.readAsDataURL(file);
}
async function uploadImage() {
  if (!uploadedImageUrl || !uploadedImageUrl.startsWith("data:")) return uploadedImageUrl;
  const r = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: uploadedImageUrl, filename: "food.jpg" }) });
  return (await r.json()).url || "";
}
async function saveFoodForm() {
  const name = document.getElementById("ff-name").value.trim();
  const ing = document.getElementById("ff-ing").value.split(",").map(s => s.trim()).filter(Boolean);
  if (!name || !ing.length) { alert("Nhập tên và nguyên liệu"); return; }
  const dup = allFoods.find(f => f.name.toLowerCase() === name.toLowerCase() && fid(f) !== editingId);
  if (dup) { document.getElementById("ff-name-err").style.display = "block"; return; }
  document.getElementById("ff-name-err").style.display = "none";
  const imageUrl = await uploadImage();
  const body = { name, ingredients: ing,
    tags: document.getElementById("ff-tags").value.split(",").map(s => s.trim()).filter(Boolean),
    nutrition: document.getElementById("ff-nut").value.split(",").map(s => s.trim()).filter(Boolean),
    region: document.getElementById("ff-region").value,
    isVegetarian: document.getElementById("ff-veg").value === "true",
    cookTime: parseInt(document.getElementById("ff-time").value) || 20,
    steps: document.getElementById("ff-steps").value.split("\n").map(s => s.trim()).filter(Boolean),
    image: imageUrl };
  if (editingId) await fetch("/api/foods/" + editingId, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  else await fetch("/api/foods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  closeFoodForm(); loadAdmin();
}
function editFood(id) { const f = allFoods.find(x => fid(x) === id); if (f) openFoodForm(f); }
function viewFood(id) { const f = allFoods.find(x => fid(x) === id); if (f) showCook(f); }
async function deleteFood(id) { if (!confirm("Xoá món này?")) return; await fetch("/api/foods/" + id, { method: "DELETE" }); loadAdmin(); }

// ========== Fridge ==========
let fridgeItems = [];

async function loadFridge() {
  try { const r = await fetch("/api/fridge"); fridgeItems = await r.json(); } catch (e) { fridgeItems = []; }
  renderFridge();
}

function renderFridge() {
  const el = document.getElementById("fridge-list");
  const countEl = document.getElementById("fridge-count");
  const sugBtn = document.getElementById("fridge-suggest-btn");
  countEl.textContent = `${fridgeItems.length} nguyên liệu trong tủ lạnh`;
  sugBtn.style.display = fridgeItems.length ? "block" : "none";
  if (!fridgeItems.length) { el.innerHTML = '<p class="menu-empty">Tủ lạnh trống. Thêm nguyên liệu sau khi đi chợ nhé!</p>'; return; }
  el.innerHTML = '<div class="fridge-grid">' + fridgeItems.map(item => `
    <div class="fridge-item">
      <div class="fridge-info">
        <span class="fridge-item-name">${item.name}</span>
        ${item.quantity ? `<span class="fridge-item-qty">${item.quantity}</span>` : ""}
      </div>
      <div class="fridge-actions">
        <button class="btn btn-danger" onclick="removeFridgeItem('${item._id}')">Xoá</button>
      </div>
    </div>`).join("") + '</div>';
}

async function addFridgeItem() {
  const nameInput = document.getElementById("fridge-name");
  const qtyInput = document.getElementById("fridge-qty");
  const raw = nameInput.value.trim();
  const qty = qtyInput.value.trim();
  if (!raw) return;
  const names = raw.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const items = names.map(n => ({ name: n, quantity: names.length === 1 ? qty : "" }));
  await fetch("/api/fridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
  nameInput.value = ""; qtyInput.value = "";
  loadFridge();
}

async function removeFridgeItem(id) {
  await fetch("/api/fridge/" + id, { method: "DELETE" });
  loadFridge();
}

async function suggestFromFridge() {
  const q = fridgeItems.map(i => i.name).join(",");
  const r = await fetch("/api/search?q=" + encodeURIComponent(q));
  const results = await r.json();
  const el = document.getElementById("fridge-suggest-result");
  if (!results.length) { el.innerHTML = '<p style="color:#888;text-align:center;margin-top:16px">Không tìm thấy món phù hợp</p>'; return; }
  el.innerHTML = '<div class="section-title" style="margin-top:24px">Món có thể nấu</div><div class="section-divider"></div><div class="card-grid">' + results.slice(0, 8).map(m => renderCard(m)).join("") + '</div>';
}

document.getElementById("fridge-name").addEventListener("keydown", e => { if (e.key === "Enter") addFridgeItem(); });

// ========== Init ==========
updateMenuCount();
fetch("/api/foods").then(r => r.json()).then(d => { allFoods = Array.isArray(d) ? d : []; }).catch(() => {});

// ========== Quick filter ==========
function quickFilter(type) {
  showPage("admin");
  if (type === "nhanh") { document.getElementById("adm-search").value = ""; document.getElementById("adm-region").value = ""; document.getElementById("adm-type").value = ""; admFiltered = allFoods.filter(f => f.cookTime <= 15); admPage = 1; renderAdmPage(); }
  else if (type === "chay") { document.getElementById("adm-search").value = ""; document.getElementById("adm-region").value = ""; document.getElementById("adm-type").value = ""; admFiltered = allFoods.filter(f => f.isVegetarian); admPage = 1; renderAdmPage(); }
  else { document.getElementById("adm-search").value = ""; document.getElementById("adm-region").value = ""; document.getElementById("adm-type").value = type; filterAdmin(); }
}