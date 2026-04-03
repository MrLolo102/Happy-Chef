const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "happy-chef-secret-key";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Chưa đăng nhập" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) { res.status(401).json({ error: "Token không hợp lệ" }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Chỉ admin mới có quyền" });
  next();
}

function signToken(user) {
  return jwt.sign({ id: user._id, username: user.username, role: user.role, displayName: user.displayName }, SECRET, { expiresIn: "30d" });
}

module.exports = { auth, adminOnly, signToken, SECRET };
