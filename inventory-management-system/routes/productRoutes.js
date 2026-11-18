const express = require("express");
const controller = require("../controllers/productController");

const router = express.Router();

router.post("/", controller.createProduct);
router.get("/", controller.getProducts);
router.get("/low-stock", controller.getLowStock);
router.get("/summary", controller.getSummary);
router.get("/:id", controller.getProductById);
router.put("/:id", controller.updateProduct);
router.patch("/:id/stock", controller.adjustStock);
router.delete("/:id", controller.deleteProduct);

module.exports = router;
