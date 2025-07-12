const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,             // ✅ if you're using category
  imageUrl: String,
  sellerEmail: String,          // ✅ this is required to fetch user-specific listings
});

module.exports = mongoose.model("Products", ProductSchema);
