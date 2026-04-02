const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  ingredients: [String],
  tags: [String],
  nutrition: [String],
  isVegetarian: { type: Boolean, default: false },
  cookTime: { type: Number, default: 20 },
  steps: [String],
  region: { type: String, enum: ["bắc", "trung", "nam"], default: "bắc" },
  image: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Food", foodSchema);
