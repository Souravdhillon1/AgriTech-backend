const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  name: String,
  phone: String,
  street: String,
  city: String,
  state: String,
  zip: String,
});

const orderItemSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  price: Number,
});

const orderSchema = new mongoose.Schema({
  items: [orderItemSchema], // Optional if you don’t have cart yet
  total: Number,
  address: addressSchema, // 🔹 Add this so delivery address is stored
  paymentMethod: String,   // 🔹 Store selected method: "COD", "PhonePe", etc
  status: { type: String, default: "Accepted" }, // Optional but good
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  name: String,
  addresses: [addressSchema],
  listedItems: [Object], // assuming you're storing products listed by user
  orders: [orderSchema]
});

module.exports = mongoose.model("User", userSchema);
