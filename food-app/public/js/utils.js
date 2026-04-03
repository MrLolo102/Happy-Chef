import { DEFAULT_IMG, REGION_NAMES } from "./config.js";

export function fid(f) { return f._id || f.id; }

export function getToken() { return localStorage.getItem("token"); }

export function authHeaders() {
  const t = getToken();
  return t
    ? { Authorization: "Bearer " + t, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export function foodImg(m) { return m.image || DEFAULT_IMG; }

export function renderCard(m, label) {
  return `<div class="card" onclick="window._onCardClick('${fid(m)}')">
    <img class="card-img" src="${foodImg(m)}" alt="${m.name}" loading="lazy" onerror="this.src='${DEFAULT_IMG}'">
    <div class="card-body">
    ${label ? `<div class="label">${label}</div>` : ""}
    <h3>${m.name}</h3>
    <div class="ingredients">${m.ingredients.join(", ")}</div>
    <div class="meta">${m.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    <div class="time">⏱ ${m.cookTime} phút</div>
    ${m.region ? `<span class="region-badge">${REGION_NAMES[m.region] || m.region}</span>` : ""}
    ${m.subCategory ? `<span class="sub-badge">${m.subCategory}</span>` : ""}
    </div></div>`;
}

export function renderPaging(page, totalPages, goFn) {
  let p = `<button ${page <= 1 ? "disabled" : ""} onclick="${goFn}(${page - 1})" aria-label="Trang trước">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) p += '<button disabled>…</button>';
      continue;
    }
    p += `<button class="${i === page ? "active" : ""}" onclick="${goFn}(${i})" aria-label="Trang ${i}">${i}</button>`;
  }
  p += `<button ${page >= totalPages ? "disabled" : ""} onclick="${goFn}(${page + 1})" aria-label="Trang sau">›</button>`;
  return p;
}
