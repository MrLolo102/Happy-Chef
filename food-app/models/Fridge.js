const mongoose = require("mongoose");

const fridgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, default: "" },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Fridge", fridgeSchema);
