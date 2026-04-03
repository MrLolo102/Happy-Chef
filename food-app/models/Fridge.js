const mongoose = require("mongoose");

const fridgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, default: "" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Fridge", fridgeSchema);
