const mongoose = require("mongoose");

const HoldingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stock",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  buyPrice: {
    type: Number,
    required: true,
  },
});

HoldingSchema.methods.invested = function () {
  return this.quantity * this.buyPrice;
};

HoldingSchema.methods.getCurrentValue = async function () {
  const Stock = mongoose.model("Stock");
  const stock = await Stock.findById(this.stock);
  if (!stock) {
    throw new Error("Associated stock not found");
  }
  return this.quantity * stock.currentPrice;
};

HoldingSchema.methods.getDayReturn = async function () {
  const Stock = mongoose.model("Stock");
  const stock = await Stock.findById(this.stock);
  if (!stock) {
    throw new Error("Associated stock not found");
  }
  const dayReturn =
    ((stock.currentPrice - stock.lastDayTradedPrice) /
      stock.lastDayTradedPrice) *
    100;
  return dayReturn.toFixed(2);
};

module.exports = mongoose.model("Holding", HoldingSchema);
