require("dotenv").config();
const mongoose = require("mongoose");
const Food = require("../models/Food");
const foods = require("../data/foods.json");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await Food.deleteMany({});
  console.log("Cleared old data");

  await Food.insertMany(foods);
  console.log(`Seeded ${foods.length} foods`);

  await mongoose.disconnect();
  console.log("Done!");
}

seed().catch(err => { console.error(err); process.exit(1); });
