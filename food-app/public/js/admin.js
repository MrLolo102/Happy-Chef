import { DEFAULT_IMG, REGION_NAMES, ADM_PER_PAGE, state } from "./config.js";
import { fid, foodImg, authHeaders } from "./utils.js";

let editingId = null;
let uploadedImageUrl = "";
let admPage = 1;
let admFiltered = [];

export async function loadAdmin() {
  document.getElementById("adm-loading").style.display = "flex";
  document.getElementById("adm-grid").innerHTML = "";
  document.getElementById("adm-paging").innerHTML = "";
  try {
    const r = await fetch("/api/foods");
    const data = await r.json();
    state.allFoods = Array.isArray(data) ? data : [];
  } catch (e) { state.allFoods = []; }
  admPage = 1;
  applyAdmFilter();
}

export function filterAdmin() {
  document.getElementById("adm-loading").style.display = "flex";
  document.getElementById("adm-grid").innerHTML = "";
  admPage = 1;
  requestAnimationFrame(() => applyAdmFilter());
}

function applyAdmFilter() {
  const q = document.getElementById("adm-search").value.toLowerCase().trim();
  const rg = document.getElementById("adm-region").value;
  const tp = document.getElementById("adm-type").value;
  let list = state.allFoods;
  if (q) {
    const kws = q.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    list = list.filter(f => kws.some(kw =>
      f.name.toLowerCase().includes(kw) || f.ingredients.some(i => i.toLowerCase().includes(kw))
    ));
  }
  if (rg) list = list.filter(f => f.region === rg);
  if (tp) {
    if (tp === "thịt") list = list.filter(f =>
      f.nutrition.some(n => ["protein","fat","iron","omega3"].includes(n)) &&
      !f.tags.includes("canh") && !f.tags.includes("rau") && !f.tags.includes("kèm") && !f.tags.includes("nộm")
    );
    else list = list.filter(f => f.tags.includes(tp));
  }
  admFiltered = list;
  renderAdmPage();
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
      <img src="${foodImg(f)}" alt="${f.name}" loading="lazy" onerror="this.src='${DEFAULT_IMG}'">
      <div class="admin-card-body">
        <h4>${f.name}</h4>
        <div class="ameta">${REGION_NAMES[f.region] || ""} · ⏱${f.cookTime}p</div>
        <div class="abtns">
          <button class="btn-secondary btn" onclick="window._viewFood('${fid(f)}')">Xem</button>
          <button class="btn-secondary btn" onclick="window._editFood('${fid(f)}')">Sửa</button>
          <button class="btn-danger btn" onclick="window._deleteFood('${fid(f)}')">Xoá</button>
        </div>
      </div>
    </div>`).join("");

  let p = `<button ${admPage <= 1 ? "disabled" : ""} onclick="window._goAdmPage(${admPage - 1})" aria-label="Trang trước">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - admPage) > 2 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) p += '<button disabled>…</button>';
      continue;
    }
    p += `<button class="${i === admPage ? 'active' : ''}" onclick="window._goAdmPage(${i})">${i}</button>`;
  }
  p += `<button ${admPage >= totalPages ? "disabled" : ""} onclick="window._goAdmPage(${admPage + 1})" aria-label="Trang sau">›</button>`;
  document.getElementById("adm-paging").innerHTML = p;
  document.getElementById("adm-loading").style.display = "none";
}

export function goAdmPage(pg) {
  admPage = pg;
  document.getElementById("adm-loading").style.display = "flex";
  document.getElementById("adm-grid").innerHTML = "";
  requestAnimationFrame(() => renderAdmPage());
}

// === Suggest dropdown ===
export function onAdmInput() {
  const q = document.getElementById("adm-search").value.toLowerCase().trim();
  const dd = document.getElementById("adm-suggest");
  if (!q) { dd.classList.remove("show"); return; }
  const matches = state.allFoods.filter(f =>
    f.name.toLowerCase().includes(q) || f.ingredients.some(i => i.toLowerCase().includes(q))
  ).slice(0, 8);
  if (!matches.length) { dd.classList.remove("show"); return; }
  dd.innerHTML = matches.map(f =>
    `<div class="sg-item" role="option" onclick="window._pickSuggest('${fid(f)}')"><div class="sg-name">${f.name}</div><div class="sg-ing">${f.ingredients.join(", ")}</div></div>`
  ).join("");
  dd.classList.add("show");
}

export function pickSuggest(id) {
  const f = state.allFoods.find(x => fid(x) === id);
  if (f) { document.getElementById("adm-search").value = f.name; hideAdmSuggest(); filterAdmin(); }
}

export function hideAdmSuggest() {
  document.getElementById("adm-suggest").classList.remove("show");
}

// === Food form ===
export function openFoodForm(food) {
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
    <label>Danh mục</label>
    <select id="ff-category" onchange="window._onCategoryChange()"><option value="thịt" ${f.category === "thịt" ? "selected" : ""}>Thịt</option><option value="rau" ${f.category === "rau" ? "selected" : ""}>Rau</option><option value="canh" ${f.category === "canh" ? "selected" : ""}>Canh</option><option value="kèm" ${f.category === "kèm" ? "selected" : ""}>Kèm</option><option value="xào" ${f.category === "xào" ? "selected" : ""}>Xào</option><option value="nộm" ${f.category === "nộm" ? "selected" : ""}>Nộm</option><option value="khác" ${f.category === "khác" ? "selected" : ""}>Khác</option></select>
    <div id="ff-sub-wrap" style="${f.category === "thịt" ? "" : "display:none"}">
      <label>Loại thịt</label>
      <select id="ff-subCategory"><option value="lợn" ${f.subCategory === "lợn" ? "selected" : ""}>Lợn</option><option value="bò" ${f.subCategory === "bò" ? "selected" : ""}>Bò</option><option value="gà" ${f.subCategory === "gà" ? "selected" : ""}>Gà</option><option value="cá" ${f.subCategory === "cá" ? "selected" : ""}>Cá</option><option value="tôm" ${f.subCategory === "tôm" ? "selected" : ""}>Tôm</option><option value="vịt" ${f.subCategory === "vịt" ? "selected" : ""}>Vịt</option><option value="hải sản" ${f.subCategory === "hải sản" ? "selected" : ""}>Hải sản</option><option value="khác" ${f.subCategory === "khác" || !f.subCategory ? "selected" : ""}>Khác</option></select>
    </div>
    <label>Món chay?</label>
    <select id="ff-veg"><option value="false" ${f.isVegetarian ? "" : "selected"}>Không</option><option value="true" ${f.isVegetarian ? "selected" : ""}>Có</option></select>
    <label>Thời gian nấu (phút)</label><input id="ff-time" type="number" value="${f.cookTime || 20}" min="1">
    <label>Các bước nấu (mỗi dòng 1 bước)</label><textarea id="ff-steps" placeholder="Bước 1&#10;Bước 2">${f.steps ? f.steps.join("\n") : ""}</textarea>
    <label>Ảnh mô tả</label><input type="file" id="ff-image" accept="image/*" onchange="window._previewImg(this)">
    ${uploadedImageUrl ? `<img class="img-preview" id="ff-preview" src="${uploadedImageUrl}" alt="Preview">` : '<img class="img-preview" id="ff-preview" style="display:none" alt="Preview">'}
    <div class="form-actions"><button class="btn btn-ghost" onclick="window._closeFoodForm()">Huỷ</button><button class="btn btn-primary" onclick="window._saveFoodForm()">Lưu</button></div>`;
  document.getElementById("form-overlay").classList.add("show");
}

export function closeFoodForm() {
  document.getElementById("form-overlay").classList.remove("show");
  editingId = null;
  uploadedImageUrl = "";
}

export function onCategoryChange() {
  document.getElementById("ff-sub-wrap").style.display =
    document.getElementById("ff-category").value === "thịt" ? "" : "none";
}

export function previewImg(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    const i = document.getElementById("ff-preview");
    i.src = e.target.result; i.style.display = "block";
    uploadedImageUrl = e.target.result;
  };
  r.readAsDataURL(file);
}

async function uploadImage() {
  if (!uploadedImageUrl || !uploadedImageUrl.startsWith("data:")) return uploadedImageUrl;
  const r = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: JSON.stringify({ data: uploadedImageUrl, filename: "food.jpg" }) });
  return (await r.json()).url || "";
}

export async function saveFoodForm() {
  const name = document.getElementById("ff-name").value.trim();
  const ing = document.getElementById("ff-ing").value.split(",").map(s => s.trim()).filter(Boolean);
  if (!name || !ing.length) { alert("Nhập tên và nguyên liệu"); return; }
  const dup = state.allFoods.find(f => f.name.toLowerCase() === name.toLowerCase() && fid(f) !== editingId);
  if (dup) { document.getElementById("ff-name-err").style.display = "block"; return; }
  document.getElementById("ff-name-err").style.display = "none";
  const imageUrl = await uploadImage();
  const body = {
    name, ingredients: ing,
    tags: document.getElementById("ff-tags").value.split(",").map(s => s.trim()).filter(Boolean),
    nutrition: document.getElementById("ff-nut").value.split(",").map(s => s.trim()).filter(Boolean),
    region: document.getElementById("ff-region").value,
    category: document.getElementById("ff-category").value,
    subCategory: document.getElementById("ff-category").value === "thịt" ? document.getElementById("ff-subCategory").value : "",
    isVegetarian: document.getElementById("ff-veg").value === "true",
    cookTime: parseInt(document.getElementById("ff-time").value) || 20,
    steps: document.getElementById("ff-steps").value.split("\n").map(s => s.trim()).filter(Boolean),
    image: imageUrl
  };
  if (editingId) await fetch("/api/foods/" + editingId, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
  else await fetch("/api/foods", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  closeFoodForm();
  loadAdmin();
}

export function editFood(id) {
  const f = state.allFoods.find(x => fid(x) === id);
  if (f) openFoodForm(f);
}

export async function deleteFood(id) {
  if (!confirm("Xoá món này?")) return;
  await fetch("/api/foods/" + id, { method: "DELETE", headers: authHeaders() });
  loadAdmin();
}

export function initAdmin() {
  document.getElementById("adm-search").addEventListener("keydown", e => {
    if (e.key === "Enter") { filterAdmin(); hideAdmSuggest(); }
  });
  document.getElementById("adm-region").addEventListener("change", filterAdmin);
  document.getElementById("adm-type").addEventListener("change", filterAdmin);
  document.addEventListener("click", e => { if (!e.target.closest(".search-wrap")) hideAdmSuggest(); });
}
