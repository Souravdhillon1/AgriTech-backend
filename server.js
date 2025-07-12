const Product = require("./models/Products");
const nodemailer=require("nodemailer")
const express=require("express")
const session=require("express-session")
const mongoose=require("mongoose")
const cors=require("cors")
const path = require('path');
const bycript=require("bcryptjs")
require("dotenv").config();
const users=require("./models/Users")
const multer  = require("multer");

// storage config – saves files into /uploads with unique names
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:   (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

const app=express();
app.use(cors({
  origin: "http://localhost:5173", // your frontend origin
  credentials: true
}));
app.use("/uploads", express.static("uploads"));

app.use(session({
  secret: "agritech-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,          // true if using HTTPS
    sameSite: "lax"         // or "none" with HTTPS
  }
}));

app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "../public/images")));
mongoose.connect(process.env.MONGO_URI,{
    useNewUrlParser: true,
  useUnifiedTopology: true

}).then(()=>console.log("Mongodb connected"))
.catch(err=>console.error("connection error :",err));
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedpassword = await bycript.hash(password, 10);
    const newUser = new users({ email, password: hashedpassword });

    await newUser.save();

    // ✅ Store user in session immediately after registration
    req.session.user = {
      email: newUser.email,
      name: newUser.name || "User", // Add name if you support it
    };

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const ismatch = await bycript.compare(password, user.password);
    if (!ismatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // ✅ Save user info to session here
    req.session.user = {
      email: user.email,
      name: user.name || "User", // Add other fields if needed
    };

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/add", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/search", async (req, res) => {
  const query = req.query.query || "";
  try {
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ]
    });
    res.json(products);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});



app.post("/api/forgot-password",async (req,res)=>{
  const {email}=req.body;
  try {
    const user=await users.findOne({email})
    if(!user){
      return res.status(404).json({message:"User not found"})
    }
    const transporter=nodemailer.createTransport({
      service:"gmail",
      auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS,
      },

    });
    
    const mailOptions={
      from:process.env.EMAIL_USER,
      to:email,
      subject:"Password-Reset-AgriTech",
      html:`
      <h3>AgriTech password reset</h3>
      <p> Click the link below to reset your password :</p>
      <a href="http://localhost:5173/reset-password?email=${encodeURIComponent(email)}">
       Reset your password
      </a>
      <p>If you didn't request this, you can safely ignore this email.</p>     
      `
    }
    await transporter.sendMail(mailOptions);

    res.status(200).json({message:"Reset link sent to your email"})
  } catch (error) {
    console.error("Forgot password error :",error)
    res.status(500).json({message:"Something went wrong"})
  }
})
app.post("/api/reset-password",async(req,res)=>{
   const {email,password}=req.body
   try {
    const user=await users.findOne({email})
    if(!user){
      return res.status(404).json({message:"User not found"})
    }
    const hashed=await bycript.hash(password,10)
    user.password=hashed
    await user.save()
    res.status(200).json({message:"Password reset successfull"})
   } catch (error) {
    console.error("Reset error :",error)
    res.status(500).json({message:"Something went wrong"})
   }
})
app.post("/api/cart", async (req, res) => {
  const { productId, quantity } = req.body;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const existingItem = req.session.cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    req.session.cart.push({ productId, quantity });
  }

  res.status(200).json({ message: "Item added to cart", cart: req.session.cart });
});

// 🛒 GET /api/cart — Fetch cart with product details
app.get("/api/cart", async (req, res) => {
  if (!req.session.cart || req.session.cart.length === 0) {
    return res.json([]);
  }

  try {
    const detailedCart = await Promise.all(
      req.session.cart.map(async ({ productId, quantity }) => {
        const product = await Product.findById(productId);
        return {
          _id: product._id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          quantity
        };
      })
    );
    res.json(detailedCart);
  } catch (error) {
    console.error("Cart fetch error:", error);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

app.delete("/api/cart/:productId", (req, res) => {
  const productId = req.params.productId;

  if (!req.session.cart) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  req.session.cart = req.session.cart.filter(item => item.productId !== productId);
  res.status(200).json({ message: "Item removed", cart: req.session.cart });
});

// ✅ Get user's addresses from MongoDB
app.get("/api/addresses", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await users.findOne({ email: req.session.user.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.addresses);
  } catch (err) {
    console.error("Fetch addresses error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Add a new address to MongoDB
app.post("/api/addresses", async (req, res) => {
  const { name, phone, street, city, state, zip } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await users.findOne({ email: req.session.user.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newAddress = { name, phone, street, city, state, zip };
    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json(newAddress);
  } catch (err) {
    console.error("Save address error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get("/api/user", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await users.findOne({ email: req.session.user.email });
    const userProducts = await Product.find({ sellerEmail: req.session.user.email });

    res.json({
      email: user.email,
      name: user.name || "N/A",
      addresses: user.addresses || [],
      orders: user.orders || [],
      listedItems: userProducts || []
    });
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/settings", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { name, emailUpdates, darkMode } = req.body;

  req.session.user.name = name;
  req.session.emailUpdates = emailUpdates;
  req.session.darkMode = darkMode;

  res.json({ message: "Settings updated." });
});

app.post("/api/sell", upload.single("image"), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { name, description, price, category } = req.body;

  if (!name || !description || !price || !category) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Image upload failed." });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  try {
    const product = new Product({
      name,
      description,
      price: Number(price),
      category, // ✅ now saved
      imageUrl,
      sellerEmail: req.session.user.email,
      createdAt: new Date(),
    });

    await product.save();
    return res.status(201).json({ message: "Item listed successfully", product });
  } catch (error) {
    console.error("Sell error:", error);
    return res.status(500).json({ message: "Failed to list item" });
  }
});

app.post("/api/orders", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { address, paymentMethod } = req.body;

  try {
    const user = await users.findOne({ email: req.session.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cart = req.session.cart || [];

    if (cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const items = await Promise.all(
      cart.map(async ({ productId, quantity }) => {
        const product = await Product.findById(productId);
        return {
          name: product.name,
          quantity: Number(quantity),
          price: Number(product.price),
        };
      })
    );

    // Ensure all items are valid
    if (!items.every(item => !isNaN(item.price) && !isNaN(item.quantity))) {
      return res.status(400).json({ message: "Invalid item in cart" });
    }

    const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const newOrder = {
      items,
      total,
      createdAt: new Date(),
      address,
      paymentMethod,
    };

    user.orders.push(newOrder);
    await user.save();

    // Clear cart
    req.session.cart = [];

    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (err) {
    console.error("Order placement error:", err);
    res.status(500).json({ message: "Server error while placing order" });
  }
});


app.post("/api/place-order", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { address, paymentMethod } = req.body;

  if (!req.session.cart || req.session.cart.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const detailedCart = await Promise.all(
    req.session.cart.map(async ({ productId, quantity }) => {
      const product = await Product.findById(productId);
      return {
        name: product.name,
        price: product.price,
        quantity,
      };
    })
  );

  const total = detailedCart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const order = {
    items: detailedCart,
    total,
    address,
    paymentMethod,
    createdAt: new Date(),
  };

  if (!req.session.orders) {
    req.session.orders = [];
  }

  req.session.orders.push(order);

  req.session.cart = []; // clear cart after order

  res.status(200).json({ message: "Order placed successfully", order });
});

const PORT=process.env.PORT||5000
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`))

