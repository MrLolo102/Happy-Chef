import { LIST_PER_PAGE } from "./config.js";
import { renderCard, renderPaging } from "./utils.js";

let searchItems = [];
let searchPage = 1;
let regionItems = [];
let regionPage = 1;

export async function searchFood() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  const r = await fetch("/api/search?q=" + encodeURIComponent(q));
  const results = await r.json();
  const el = document.getElementById("search-result");
  if (!results.length) {
    el.innerHTML = '<p style="color:#888">Không tìm thấy</p>';
    document.getElementById("search-paging").innerHTML = "";
    document.getElementById("search-count").textContent = "";
    return;
  }
  searchItems = results;
  searchPage = 1;
  renderSearchPage();
}

function renderSearchPage() {
  const total = searchItems.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PER_PAGE));
  if (searchPage > totalPages) searchPage = totalPages;
  const start = (searchPage - 1) * LIST_PER_PAGE;
  const items = searchItems.slice(start, start + LIST_PER_PAGE);
  document.getElementById("search-count").textContent = `${total} kết quả · Trang ${searchPage}/${totalPages}`;
  document.getElementById("search-result").innerHTML = items.map(m => renderCard(m)).join("");
  document.getElementById("search-paging").innerHTML = totalPages > 1 ? renderPaging(searchPage, totalPages, "window._goSearchPage") : "";
}

export function goSearchPage(pg) { searchPage = pg; renderSearchPage(); }

export async function loadRegion(region, btn) {
  document.querySelectorAll("#region-tabs button").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
  }
  const r = await fetch("/api/region/" + encodeURIComponent(region));
  regionItems = await r.json();
  regionPage = 1;
  renderRegionPage();
}

function renderRegionPage() {
  const total = regionItems.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PER_PAGE));
  if (regionPage > totalPages) regionPage = totalPages;
  const start = (regionPage - 1) * LIST_PER_PAGE;
  const items = regionItems.slice(start, start + LIST_PER_PAGE);
  document.getElementById("region-count").textContent = `${total} món · Trang ${regionPage}/${totalPages}`;
  document.getElementById("region-result").innerHTML = items.map(m => renderCard(m)).join("");
  document.getElementById("region-paging").innerHTML = totalPages > 1 ? renderPaging(regionPage, totalPages, "window._goRegionPage") : "";
}

export function goRegionPage(pg) { regionPage = pg; renderRegionPage(); }

export function initSearch() {
  document.getElementById("search-input").addEventListener("keydown", e => {
    if (e.key === "Enter") searchFood();
  });
}
