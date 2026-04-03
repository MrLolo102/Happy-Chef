import { PAGE_IDS, state } from "./config.js";
import { fid, foodImg } from "./utils.js";
import { DEFAULT_IMG } from "./config.js";
import { checkAuth, showAuthModal, closeAuthModal, toggleAuthMode, submitAuth, logout, updateAuthUI } from "./auth.js";
import { updateMenuCount, renderMenu, removeFromMenu, saveMenu, addToHistory, renderHistory } from "./menu.js";
import { suggest } from "./suggest.js";
import { searchFood, goSearchPage, loadRegion, goRegionPage, initSearch, browseByFilter } from "./search.js";
import { loadFridge, addFridgeItem, removeFridgeItem, suggestFromFridge, initFridge } from "./fridge.js";
import { loadAdmin, filterAdmin, goAdmPage, onAdmInput, pickSuggest, hideAdmSuggest, openFoodForm, closeFoodForm, onCategoryChange, previewImg, saveFoodForm, editFood, deleteFood, initAdmin } from "./admin.js";

// ========== Navigation ==========
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const btns = document.querySelectorAll("#nav-tabs button");
  btns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
  document.getElementById(id).classList.add("active");
  PAGE_IDS.forEach((n, i) => {
    if (n === id && btns[i]) { btns[i].classList.add("active"); btns[i].setAttribute("aria-selected", "true"); }
  });
  document.querySelectorAll(".mobile-nav-item").forEach(b => b.classList.remove("active"));
  const mobileMap = { suggest: 0, search: 1, fridge: 2, menu: 3, region: 4 };
  if (mobileMap[id] !== undefined) document.querySelectorAll(".mobile-nav-item")[mobileMap[id]]?.classList.add("active");

  if (id === "menu") renderMenu();
  if (id === "history") renderHistory();
  if (id === "fridge") loadFridge();
  if (id === "admin") {
    if (!state.currentUser || state.currentUser.role !== "admin") {
      alert("Chỉ admin mới truy cập được");
      showPage("suggest");
      return;
    }
    loadAdmin();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ========== Card click / Cook popup ==========
let pendingFood = null;

function onCardClick(id) {
  const f = state.allFoods.find(x => fid(x) === id);
  if (!f) return;
  if (state.todayMenu.some(m => fid(m) === fid(f))) { alert("Đã có trong thực đơn!"); return; }
  pendingFood = f;
  document.getElementById("popup-title").textContent = f.name;
  document.getElementById("add-overlay").classList.add("show");
}

function closeAddPopup() { document.getElementById("add-overlay").classList.remove("show"); pendingFood = null; }

function confirmAdd() {
  if (pendingFood) { state.todayMenu.push(pendingFood); saveMenu(); addToHistory(pendingFood); }
  closeAddPopup();
}

function showCook(f) {
  document.getElementById("cook-detail").innerHTML = `
    <img class="cook-img" src="${foodImg(f)}" alt="${f.name}" onerror="this.src='${DEFAULT_IMG}'">
    <div class="cook-body">
      <h3>${f.name}</h3>
      <div class="detail-row"><div class="detail-label">Nguyên liệu</div><div>${f.ingredients.join(", ")}</div></div>
      <div class="detail-row"><div class="detail-label">Thời gian</div><div>⏱ ${f.cookTime} phút</div></div>
      <div class="detail-row"><div class="detail-label">Các bước</div><ol class="step-list">${f.steps.map(s => `<li>${s}</li>`).join("")}</ol></div>
      <button class="btn btn-ghost" onclick="window._closeCookPopup()" style="margin-top:16px">Đóng</button>
    </div>`;
  document.getElementById("cook-overlay").classList.add("show");
}

function closeCookPopup() { document.getElementById("cook-overlay").classList.remove("show"); }

function viewFood(id) { const f = state.allFoods.find(x => fid(x) === id); if (f) showCook(f); }

// ========== Quick filter ==========
function quickFilter(type) {
  showPage("search");
  browseByFilter(type, state.allFoods);
}

// ========== Bridge: expose functions to inline onclick handlers ==========
window._onCardClick = onCardClick;
window._closeAddPopup = closeAddPopup;
window._confirmAdd = confirmAdd;
window._closeCookPopup = closeCookPopup;
window._viewFood = viewFood;
window._removeFromMenu = removeFromMenu;
window._showPage = showPage;
window._suggest = suggest;
window._searchFood = searchFood;
window._searchFood = searchFood;
window._goSearchPage = goSearchPage;
window._loadRegion = loadRegion;
window._goRegionPage = goRegionPage;
window._quickFilter = quickFilter;
window._showAuthModal = showAuthModal;
window._closeAuthModal = closeAuthModal;
window._toggleAuthMode = toggleAuthMode;
window._submitAuth = submitAuth;
window._logout = () => logout(showPage);
window._loadAdmin = loadAdmin;
window._filterAdmin = filterAdmin;
window._goAdmPage = goAdmPage;
window._onAdmInput = onAdmInput;
window._pickSuggest = pickSuggest;
window._openFoodForm = () => openFoodForm();
window._closeFoodForm = closeFoodForm;
window._onCategoryChange = onCategoryChange;
window._previewImg = previewImg;
window._saveFoodForm = saveFoodForm;
window._editFood = editFood;
window._deleteFood = deleteFood;
window._addFridgeItem = addFridgeItem;
window._removeFridgeItem = removeFridgeItem;
window._suggestFromFridge = suggestFromFridge;

// ========== Init ==========
checkAuth();
updateMenuCount();
initSearch();
initFridge();
initAdmin();
fetch("/api/foods").then(r => r.json()).then(d => { state.allFoods = Array.isArray(d) ? d : []; }).catch(() => {});
