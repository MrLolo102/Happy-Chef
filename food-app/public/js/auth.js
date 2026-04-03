import { state } from "./config.js";
import { getToken } from "./utils.js";

let authMode = "login";

export function updateAuthUI() {
  const authEl = document.getElementById("nav-auth");
  const userEl = document.getElementById("nav-user");
  const adminTab = document.getElementById("nav-admin");
  if (state.currentUser) {
    authEl.style.display = "none";
    userEl.style.display = "flex";
    document.getElementById("nav-username").textContent =
      state.currentUser.displayName || state.currentUser.username;
    adminTab.style.display = state.currentUser.role === "admin" ? "" : "none";
  } else {
    authEl.style.display = "flex";
    userEl.style.display = "none";
    adminTab.style.display = "none";
  }
}

export function showAuthModal(mode) {
  authMode = mode || "login";
  document.getElementById("auth-title").textContent = authMode === "login" ? "Đăng nhập" : "Đăng ký";
  document.getElementById("auth-submit").textContent = authMode === "login" ? "Đăng nhập" : "Đăng ký";
  document.getElementById("auth-name").style.display = authMode === "register" ? "" : "none";
  document.getElementById("auth-switch").innerHTML = authMode === "login"
    ? 'Chưa có tài khoản? <a href="#" onclick="window._toggleAuthMode(event)">Đăng ký</a>'
    : 'Đã có tài khoản? <a href="#" onclick="window._toggleAuthMode(event)">Đăng nhập</a>';
  document.getElementById("auth-error").textContent = "";
  document.getElementById("auth-user").value = "";
  document.getElementById("auth-pass").value = "";
  document.getElementById("auth-name").value = "";
  document.getElementById("auth-overlay").classList.add("show");
}

export function closeAuthModal() {
  document.getElementById("auth-overlay").classList.remove("show");
}

export function toggleAuthMode(e) {
  e.preventDefault();
  showAuthModal(authMode === "login" ? "register" : "login");
}

export async function submitAuth() {
  const username = document.getElementById("auth-user").value.trim();
  const password = document.getElementById("auth-pass").value;
  const displayName = document.getElementById("auth-name").value.trim();
  if (!username || !password) {
    document.getElementById("auth-error").textContent = "Nhập username và password";
    return;
  }
  try {
    const url = authMode === "login" ? "/api/login" : "/api/register";
    const body = authMode === "login" ? { username, password } : { username, password, displayName };
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { document.getElementById("auth-error").textContent = d.error; return; }
    localStorage.setItem("token", d.token);
    state.currentUser = d.user;
    updateAuthUI();
    closeAuthModal();
  } catch (e) {
    document.getElementById("auth-error").textContent = "Lỗi kết nối";
  }
}

export function logout(showPageFn) {
  localStorage.removeItem("token");
  state.currentUser = null;
  updateAuthUI();
  showPageFn("suggest");
}

export async function checkAuth() {
  const token = getToken();
  if (!token) { updateAuthUI(); return; }
  try {
    const r = await fetch("/api/me", { headers: { Authorization: "Bearer " + token } });
    if (r.ok) { state.currentUser = await r.json(); }
    else { localStorage.removeItem("token"); state.currentUser = null; }
  } catch (e) { state.currentUser = null; }
  updateAuthUI();
}
