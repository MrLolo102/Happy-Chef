const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const Food = require("../models/Food");
const Fridge = require("../models/Fridge");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Gợi ý bữa ăn
router.get("/suggest", async (req, res) => {
  try {
    const foods = await Food.find().lean();
    const main = foods.filter(f => f.nutrition.includes("protein") && !f.tags.includes("canh") && !f.tags.includes("rau") && !f.tags.includes("kèm") && !f.tags.includes("nộm"));
    const veg = foods.filter(f => f.tags.some(t => ["rau", "xào"].includes(t)) && f.nutrition.some(n => ["fiber", "vitamin", "vitamin A"].includes(n)));
    const soup = foods.filter(f => f.tags.includes("canh") || f.tags.includes("kèm"));
    res.json([pick(main), pick(veg), pick(soup)]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Tìm theo nguyên liệu
router.get("/search", async (req, res) => {
  try {
    const raw = new URL(req.url, `http://${req.headers.host}`).searchParams.get("q") || "";
    const q = raw.toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    if (!q.length) return res.json([]);
    const foods = await Food.find().lean();
    const scored = foods.map(f => {
      const matched = q.filter(kw => f.ingredients.some(i => i.toLowerCase().includes(kw)) || f.name.toLowerCase().includes(kw));
      return { ...f, score: matched.length };
    }).filter(f => f.score > 0);
    scored.sort((a, b) => b.score - a.score);
    res.json(scored);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vùng miền
router.get("/region/:region", async (req, res) => {
  try {
    const foods = await Food.find({ region: req.params.region.toLowerCase() }).lean();
    res.json(foods);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CRUD
router.get("/foods", async (req, res) => {
  try {
    const foods = await Food.find().lean();
    res.json(foods);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/foods", async (req, res) => {
  try {
    const food = await Food.create(req.body);
    res.json(food);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: "Tên món đã tồn tại" });
    res.status(500).json({ error: e.message });
  }
});

router.put("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!food) return res.status(404).json({ error: "Not found" });
    res.json(food);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/foods/:id", async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upload ảnh - lưu base64 vào response (ảnh sẽ được lưu trong MongoDB qua field image)
router.post("/upload", (req, res) => {
  const { data, filename } = req.body;
  if (!data || !filename) return res.status(400).json({ error: "Missing data" });
  // Trả lại base64 data URL trực tiếp, sẽ được lưu vào MongoDB cùng food document
  res.json({ url: data });
});

// === Tủ lạnh ===
router.get("/fridge", async (req, res) => {
  try { res.json(await Fridge.find().sort({ addedAt: -1 }).lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/fridge", async (req, res) => {
  try {
    const items = req.body.items || [{ name: req.body.name, quantity: req.body.quantity }];
    const docs = await Fridge.insertMany(items);
    res.json(docs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/fridge/:id", async (req, res) => {
  try {
    const item = await Fridge.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/fridge/:id", async (req, res) => {
  try {
    await Fridge.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;