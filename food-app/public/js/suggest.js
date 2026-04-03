import { authHeaders, renderCard } from "./utils.js";

export async function suggest() {
  const r = await fetch("/api/suggest", { headers: authHeaders() });
  const d = await r.json();
  const section = (title, items) => {
    const valid = (items || []).filter(Boolean);
    if (!valid.length) return "";
    return `<div class="suggest-section"><h3 class="suggest-group-title">${title}</h3><div class="card-grid">${valid.map(m => renderCard(m)).join("")}</div></div>`;
  };
  document.getElementById("suggest-result").innerHTML =
    section("🥩 Món thịt", d.meat) +
    section("🍲 Canh", d.soup) +
    section("🥬 Món rau", d.veg) +
    section("🍢 Món kèm", d.side);
}
