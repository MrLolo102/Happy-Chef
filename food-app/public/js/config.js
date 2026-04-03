export const DEFAULT_IMG = "/img/default-food.svg";
export const REGION_NAMES = { "bắc": "Miền Bắc", "trung": "Miền Trung", "nam": "Miền Nam" };
export const PAGE_IDS = ["suggest", "search", "region", "menu", "history", "fridge", "admin"];
export const ADM_PER_PAGE = 8;
export const LIST_PER_PAGE = 8;

// Shared state
export const state = {
  currentUser: null,
  allFoods: [],
  todayMenu: JSON.parse(localStorage.getItem("todayMenu") || "[]"),
};
