const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  ingredients: [String],
  tags: [String],
  nutrition: [String],
  category: { type: String, enum: ["thịt", "rau", "canh", "kèm", "xào", "nộm", "khác"], default: "khác" },
  subCategory: { type: String, default: "" }, // lợn, bò, gà, cá, tôm, vịt, hải sản...
  isVegetarian: { type: Boolean, default: false },
  cookTime: { type: Number, default: 20 },
  steps: [String],
  region: { type: String, enum: ["bắc", "trung", "nam"], default: "bắc" },
  image: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Food", foodSchema);
