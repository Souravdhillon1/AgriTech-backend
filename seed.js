const mongoose = require("mongoose");
require("dotenv").config();
const Product = require("./models/Products");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to DB"))
  .catch(err => console.error("DB connection error:", err));

const sampleProducts = [
  {
    name: "Urea Fertilizer",
    description: "High-nitrogen fertilizer ideal for boosting leafy growth.",
    price: 299,
    imageUrl: "http://localhost:5000/images/urea.jpg",
    category: "fertilizers"
  },
  {
    name: "Organic Compost",
    description: "Eco-friendly compost that enriches soil fertility naturally.",
    price: 180,
    imageUrl: "http://localhost:5000/images/organic_compost.jpg",
    category: "fertilizers"
  },
  {
    name: "Weedicide Spray",
    description: "Effective weed control formula to ensure clean crops.",
    price: 250,
    imageUrl: "http://localhost:5000/images/weedicide_spray.jpeg",
    category: "pesticides"
  },
  {
    name: "Herbicide Pro",
    description: "Strong herbicide for post-emergence weed management.",
    price: 320,
    imageUrl: "http://localhost:5000/images/herbicide_pro.jpeg",
    category: "pesticides"
  },
  {
    name: "Potash Fertilizer",
    description: "Improves crop quality and enhances drought resistance.",
    price: 275,
    imageUrl: "http://localhost:5000/images/potash2.jpeg",
    category: "fertilizers"
  },
  {
    name: "Bio Pesticide",
    description: "Natural pest control solution, safe for crops and farmers.",
    price: 220,
    imageUrl: "http://localhost:5000/images/bioooo.jpeg",
    category: "pesticides"
  },
  {
    name: "DAP Fertilizer",
    description: "Di-ammonium phosphate fertilizer for strong root development.",
    price: 350,
    imageUrl: "http://localhost:5000/images/dap.jpeg",
    category: "fertilizers"
  },
  {
    name: "Tractor Lubricant",
    description: "High-performance engine oil for agricultural machinery.",
    price: 480,
    imageUrl: "http://localhost:5000/images/lubricant.jpg",
    category: "tools"
  }
];

async function seedDB() {
  try {
    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log("✅ Products seeded successfully");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    mongoose.disconnect();
  }
}

seedDB();
