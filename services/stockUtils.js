const { NotFoundError } = require("../errors");
const Stock = require("../models/Stock");

const roundToTwoDecimals = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const generateStockData = async (symbol) => {
  const stock = await Stock.findOne({ symbol });
  if (!stock) {
    throw new NotFoundError("Stock not found");
  }

  const now = new Date();
  const minChange = -0.5;
  const maxChange = 0.5;
  const currentPrice = stock.currentPrice;
  const changePercentage =
    (Math.random() * (maxChange - minChange) + minChange) / 100;
  const close = roundToTwoDecimals(currentPrice * (1 + changePercentage));
  const high = roundToTwoDecimals(Math.max(currentPrice, close) + (Math.random() * 5 - 2.5));
  const low = roundToTwoDecimals(Math.min(currentPrice, close) - (Math.random() * 5 - 2.5));
  const timestamp = now.toISOString();

  const lastItem = stock.dayTimeSeries[stock.dayTimeSeries.length - 1];
  if (!lastItem || now - new Date(lastItem.timestamp) > 1 * 60 * 1000) {
    // If last item is older than 3 minutes or there's no item yet, push a new item
    stock.dayTimeSeries.push({
      timestamp,
      open: roundToTwoDecimals(currentPrice),
      high,
      low,
      close,
    });
  } else {
    // Update the last item
    lastItem.high = high;
    lastItem.low = low;
    lastItem.close = close;
  }

  // Keep only 6.5 hours (390 minutes) of 1-minute candles
  stock.dayTimeSeries = stock.dayTimeSeries.slice(-390);

  stock.currentPrice = close;

  await stock.save();

  return stock;
};

const store10Min = async (symbol) => {
  const stock = await Stock.findOne({ symbol });
  if (!stock) {
    throw new NotFoundError("Stock not found");
  }
  const now = new Date();
  const currentPrice = stock.currentPrice;
  const latestItem = stock.dayTimeSeries[stock.dayTimeSeries.length - 1];

  const timestamp = now.toISOString();
  // 10 min candle
  stock.tenMinTimeSeries.push({
    timestamp,
    open: roundToTwoDecimals(currentPrice),
    high: roundToTwoDecimals(latestItem.high),
    low: roundToTwoDecimals(latestItem.low),
    close: roundToTwoDecimals(latestItem.close),
  });

  await stock.save();
  return stock;
};

module.exports = { generateStockData, store10Min };
