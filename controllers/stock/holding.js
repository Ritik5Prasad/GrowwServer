const { StatusCodes } = require("http-status-codes");
const { BadRequestError } = require("../../errors");
const Holding = require("../../models/Holding");
const User = require("../../models/User");
const Order = require("../../models/Order");
const jwt = require("jsonwebtoken");
const Stock = require("../../models/Stock");

const buyStock = async (req, res) => {
  const { stock_id, quantity } = req.body;

  if (!stock_id || !quantity) {
    throw new BadRequestError("Invalid Request. Missing required fields.");
  }

  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET);
  const userId = decodedToken.userId;
  try {
    const stock = await Stock.findById(stock_id);
    const buyPrice = stock.currentPrice;

    const totalPrice = quantity * buyPrice;
    const currentUser = await User.findById(userId);
    if (currentUser.balance < totalPrice) {
      throw new BadRequestError("Insufficient balance");
    }
    currentUser.balance -= totalPrice;
    await currentUser.save();

    const newHolding = new Holding({
      user: userId,
      stock: stock_id,
      quantity,
      buyPrice,
    });
    await newHolding.save();

    const order = new Order({
      user: userId,
      stock: stock_id,
      quantity,
      price: buyPrice,
      type: "buy",
      remainingBalance: currentUser.balance,
    });
    await order.save();

    res.status(StatusCodes.CREATED).json({
      msg: "Stock bought successfully!",
      data: newHolding,
    });
  } catch (error) {
    throw new BadRequestError("Failed to buy stock. " + error.message);
  }
};

const sellStock = async (req, res) => {
  const { holdingId, quantity } = req.body;
  if (!holdingId || !quantity) {
    throw new BadRequestError("Invalid Request. Missing required fields.");
  }

  try {
    const holding = await Holding.findById(holdingId);
    if (!holding) {
      throw new BadRequestError("Holding not found");
    }

    if (quantity > holding.quantity) {
      throw new BadRequestError("Invalid quantity");
    }

    const stock = await Stock.findById(holding.stock._id);
    const sellPrice = quantity * stock.currentPrice;

    holding.quantity -= quantity;
    if (holding.quantity <= 0) {
      await Holding.findByIdAndDelete(holdingId);
    } else {
      await holding.save();
    }

    const currentUser = await User.findById(holding.user);
    if (!currentUser) {
      throw new BadRequestError("User not found");
    }

    currentUser.balance += sellPrice;
    await currentUser.save();

    const order = new Order({
      user: holding.user,
      stock: holding.stock,
      quantity,
      price: stock.currentPrice,
      type: "sell",
      remainingBalance: currentUser.balance,
    });
    await order.save();

    res.status(StatusCodes.OK).json({
      msg: "Stock sold successfully!",
      data: { orderId: order._id, sellPrice },
    });
  } catch (error) {
    throw new BadRequestError("Failed to sell stock. " + error.message);
  }
};

const getAllHoldings = async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];
  const decodedToken = jwt.verify(accessToken, process.env.SOCKET_TOKEN_SECRET);
  const userId = decodedToken.userId;

  try {
    const holdings = await Holding.find({ user: userId }).populate({
      path: "stock",
      select: "-dayTimeSeries -tenMinTimeSeries",
    });
    res.status(StatusCodes.OK).json({
      msg: "Holdings retrieved successfully!",
      data: holdings,
    });
  } catch (error) {
    throw new BadRequestError("Failed to retrieve holdings. " + error.message);
  }
};

module.exports = {
  buyStock,
  sellStock,
  getAllHoldings,
};
