require("dotenv").config();
const mongoose = require("mongoose");
const Food = require("../models/Food");

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const foods = await Food.find();
  for (const f of foods) {
    // Xác định category
    if (f.tags.includes("canh")) f.category = "canh";
    else if (f.tags.includes("kèm") || f.tags.includes("nộm")) f.category = "kèm";
    else if (f.tags.includes("rau")) f.category = "rau";
    else if (f.tags.includes("xào")) f.category = "xào";
    else if (f.nutrition.some(n => ["protein", "fat", "iron", "omega3"].includes(n))) f.category = "thịt";
    else f.category = "khác";

    // Xác định subCategory cho thịt
    if (f.category === "thịt") {
      const name = f.name.toLowerCase();
      const ings = f.ingredients.map(i => i.toLowerCase()).join(" ");
      const all = name + " " + ings;
      if (all.includes("gà")) f.subCategory = "gà";
      else if (all.includes("bò")) f.subCategory = "bò";
      else if (all.includes("cá")) f.subCategory = "cá";
      else if (all.includes("tôm")) f.subCategory = "tôm";
      else if (all.includes("vịt")) f.subCategory = "vịt";
      else if (all.includes("hải sản") || all.includes("mực") || all.includes("cua") || all.includes("nghêu")) f.subCategory = "hải sản";
      else if (all.includes("lợn") || all.includes("heo") || all.includes("sườn") || all.includes("ba chỉ") || all.includes("thịt")) f.subCategory = "lợn";
      else f.subCategory = "khác";
    }

    await f.save();
    console.log(`${f.name} → ${f.category}${f.subCategory ? " / " + f.subCategory : ""}`);
  }
  console.log("Done!");
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
