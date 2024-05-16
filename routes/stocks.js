const express = require("express");
const { registerStock, getAllStocks } = require("../controllers/stock/stock");
const {
  buyStock,
  sellStock,
  getAllHoldings,
} = require("../controllers/stock/holding");
const { getOrder } = require("../controllers/stock/order");
const router = express.Router();

router.post("/register", registerStock);
router.get("", getAllStocks);
router.post("/buy", buyStock);
router.post("/sell", sellStock);
router.get("/order", getOrder);
router.get("/holding", getAllHoldings);

module.exports = router;
