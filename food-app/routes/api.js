const express = require("express");
const router = express.Router();
const Food = require("../models/Food");
const Fridge = require("../models/Fridge");
const User = require("../models/User");
const { auth, adminOnly, signToken } = require("../middleware/auth");

// === Auth ===
router.post("/register", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Nhập username và password" });
    if (password.length < 4) return res.status(400).json({ error: "Password ít nhất 4 ký tự" });
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Username đã tồn tại" });
    const count = await User.countDocuments();
    const user = await User.create({ username, password, displayName: displayName || username, role: count === 0 ? "admin" : "user" });
    res.json({ token: signToken(user), user: { username: user.username, displayName: user.displayName, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: "Sai username hoặc password" });
    res.json({ token: signToken(user), user: { username: user.username, displayName: user.displayName, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/me", auth, (req, res) => {
  res.json({ username: req.user.username, displayName: req.user.displayName, role: req.user.role });
});

// === Gợi ý (public, nhưng nếu đăng nhập thì ưu tiên tủ lạnh) ===
router.get("/suggest", async (req, res) => {
  try {
    const foods = await Food.find().lean();
    let fridgeNames = [];
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, require("../middleware/auth").SECRET);
        const fridgeItems = await Fridge.find({ userId: decoded.id }).lean();
        fridgeNames = fridgeItems.map(i => i.name.toLowerCase());
      } catch (e) {}
    }

    const main = foods.filter(f => f.nutrition.includes("protein") && !f.tags.includes("canh") && !f.tags.includes("rau") && !f.tags.includes("kèm") && !f.tags.includes("nộm"));
    const veg = foods.filter(f => f.tags.some(t => ["rau", "xào"].includes(t)) && f.nutrition.some(n => ["fiber", "vitamin", "vitamin A"].includes(n)));
    const soup = foods.filter(f => f.tags.includes("canh") || f.tags.includes("kèm"));

    const score = (f) => f.ingredients.filter(i => fridgeNames.some(fn => i.toLowerCase().includes(fn) || fn.includes(i.toLowerCase()))).length;
    const pickN = (arr, n) => {
      if (!fridgeNames.length) return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
      return arr.map(f => ({ ...f, _score: score(f) })).sort((a, b) => b._score - a._score || Math.random() - 0.5).slice(0, n);
    };

    res.json({ meat: pickN(main, 3), soup: pickN(soup, 2), veg: pickN(veg, 3) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === Search & Region (public) ===
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

router.get("/region/:region", async (req, res) => {
  try { res.json(await Food.find({ region: req.params.region.toLowerCase() }).lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// === Foods: đọc public, sửa/xoá cần admin ===
router.get("/foods", async (req, res) => {
  try { res.json(await Food.find().lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/foods", auth, adminOnly, async (req, res) => {
  try {
    const food = await Food.create(req.body);
    res.json(food);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: "Tên món đã tồn tại" });
    res.status(500).json({ error: e.message });
  }
});

router.put("/foods/:id", auth, adminOnly, async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!food) return res.status(404).json({ error: "Not found" });
    res.json(food);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/foods/:id", auth, adminOnly, async (req, res) => {
  try {
    await Food.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === Upload ảnh (admin) ===
router.post("/upload", auth, adminOnly, (req, res) => {
  const { data, filename } = req.body;
  if (!data || !filename) return res.status(400).json({ error: "Missing data" });
  res.json({ url: data });
});

// === Tủ lạnh (mỗi user riêng) ===
router.get("/fridge", auth, async (req, res) => {
  try { res.json(await Fridge.find({ userId: req.user.id }).sort({ addedAt: -1 }).lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/fridge", auth, async (req, res) => {
  try {
    const items = (req.body.items || [{ name: req.body.name, quantity: req.body.quantity }]).map(i => ({ ...i, userId: req.user.id }));
    const docs = await Fridge.insertMany(items);
    res.json(docs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/fridge/:id", auth, async (req, res) => {
  try {
    const item = await Fridge.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/fridge/:id", auth, async (req, res) => {
  try {
    await Fridge.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
