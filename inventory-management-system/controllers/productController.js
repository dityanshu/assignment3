const mongoose = require("mongoose");
const Product = require("../models/Product");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

exports.getProducts = asyncHandler(async (req, res) => {
  const {
    category, search, sort = "createdAt", order = "desc",
    page = 1, limit = 10
  } = req.query;

  const filter = {};
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { name: new RegExp(safeSearch, "i") },
      { sku: new RegExp(safeSearch, "i") },
      { supplier: new RegExp(safeSearch, "i") }
    ];
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;
  const allowedSort = ["name", "price", "quantity", "createdAt", "category"];
  const sortField = allowedSort.includes(sort) ? sort : "createdAt";

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize),
    Product.countDocuments(filter)
  ]);

  res.json({
    total,
    page: pageNumber,
    totalPages: Math.ceil(total / pageSize),
    count: products.length,
    products
  });
});

exports.getProductById = asyncHandler(async (req, res) => {
  const product = await findProduct(req.params.id);
  res.json(product);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  delete updates._id;
  delete updates.stockValue;
  const product = await Product.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const change = Number(req.body.change);
  if (!Number.isInteger(change) || change === 0) {
    return res.status(400).json({ message: "change must be a non-zero integer (positive to restock, negative for sale)" });
  }

  const product = await findProduct(req.params.id);
  if (product.quantity + change < 0) {
    return res.status(400).json({ message: "Insufficient stock for this sale" });
  }

  product.quantity += change;
  await product.save();
  res.json({ message: "Stock updated", product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Product deleted", id: product._id });
});

exports.getLowStock = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.find({
    $expr: { $lte: ["$quantity", "$reorderLevel"] }
  }).sort({ quantity: 1 });
  res.json({ count: lowStockItems.length, lowStockItems });
});

exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        avgPrice: { $avg: "$price" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  res.json({ categories: summary.length, summary });
});

async function findProduct(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid product ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  return product;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
