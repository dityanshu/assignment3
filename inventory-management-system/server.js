require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Inventory Management API is running" });
});

app.use("/api/products", productRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("Could not start server:", error.message);
    process.exit(1);
  });
