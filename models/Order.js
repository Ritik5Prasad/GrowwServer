const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
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
  price: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["buy", "sell"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  remainingBalance: {
    type: Number,
    required: true,
    set: function (value) {
      return parseFloat(value.toFixed(2));
    },
  },
});

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
