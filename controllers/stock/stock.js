const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../../errors");
const Stock = require("../../models/Stock");

const registerStock = async (req, res) => {
  const { symbol, companyName, iconUrl, lastDayTradedPrice, currentPrice } =
    req.body;
  if (
    !symbol ||
    !companyName ||
    !iconUrl ||
    !lastDayTradedPrice ||
    !currentPrice
  ) {
    throw new BadRequestError("Invalid Request. Missing required fields.");
  }

  try {
    const existingStock = await Stock.findOne({ symbol });
    if (existingStock) {
      throw new BadRequestError("Stock already exists!");
    }

    const newStock = new Stock({
      symbol,
      companyName,
      iconUrl,
      lastDayTradedPrice,
      currentPrice,
    });

    await newStock.save();

    res.status(StatusCodes.CREATED).json({
      msg: "Stock added successfully!",
      data: newStock,
    });
  } catch (error) {
    throw new BadRequestError("Failed to add stock. " + error.message);
  }
};

const getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find().select(
      "-dayTimeSeries -tenMinTimeSeries"
    );
    res.status(StatusCodes.OK).json({
      msg: "Stocks retrieved successfully!",
      data: stocks,
    });
  } catch (error) {
    throw new BadRequestError("Failed to retrieve stocks. " + error.message);
  }
};

const getStockBySymbol = async (req, res) => {
  const { stock: symbol } = req.query;
  if (!symbol) {
    throw new BadRequestError("Stock symbol is required");
  }

  try {
    const stock = await Stock.findOne({ symbol });
    if (!stock) {
      throw new NotFoundError("Stock not found");
    }
    res.status(StatusCodes.OK).json({
      msg: "Stock retrieved successfully!",
      data: stock,
    });
  } catch (error) {
    throw new BadRequestError("Failed to retrieve stock. " + error.message);
  }
};

module.exports = {
  registerStock,
  getAllStocks,
  getStockBySymbol,
};
