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
  const minChange = -0.02;
  const maxChange = 0.02;
  const trendChange = 0.005;
  const currentPrice = stock.currentPrice;

  // Determine current trend (sideways, uptrend, downtrend)
  const trendType = Math.random();
  let trendModifier = 0;

  if (trendType < 0.33) {
    // Sideways trend: no additional change
    trendModifier = 0;
  } else if (trendType < 0.66) {
    // Uptrend: positive bias
    trendModifier = trendChange;
  } else {
    // Downtrend: negative bias
    trendModifier = -trendChange;
  }

  const changePercentage =
    Math.random() * (maxChange - minChange) + minChange + trendModifier;

  // Calculate the close price
  const close = roundToTwoDecimals(currentPrice * (1 + changePercentage));

  // Generate high and low prices based on common candlestick patterns
  const patternType = Math.random();
  let high, low;

  if (patternType < 0.15) {
    // Marubozu pattern
    high = Math.max(currentPrice, close);
    low = Math.min(currentPrice, close);
  } else if (patternType < 0.3) {
    // Hammer pattern
    high = Math.max(currentPrice, close);
    low = Math.min(currentPrice, close) - Math.random() * 2;
  } else if (patternType < 0.45) {
    // Inverted Hammer pattern
    high = Math.max(currentPrice, close) + Math.random() * 2;
    low = Math.min(currentPrice, close);
  } else if (patternType < 0.6) {
    // Shooting Star pattern
    high = Math.max(currentPrice, close) + Math.random() * 2;
    low = Math.min(currentPrice, close);
  } else {
    if (Math.random() < 0.5) {
      high = close + Math.random() * 4; // Long bullish candle
      low = close - Math.random() * 2;
    } else {
      high = close + Math.random() * 2;
      low = close - Math.random() * 4; // Long bearish candle
    }
  }

  high = roundToTwoDecimals(high);
  low = roundToTwoDecimals(low);

  const timestamp = now.toISOString();
  const time = now.getTime() / 1000;
  const lastItem = stock.dayTimeSeries[stock.dayTimeSeries.length - 1];

  // Ensure a realistic update interval (every 1 minute)
  if (!lastItem || now - new Date(lastItem.timestamp) > 1 * 60 * 1000) {
    stock.dayTimeSeries.push({
      timestamp,
      time,
      _internal_originalTime: time,
      open: roundToTwoDecimals(currentPrice),
      high,
      low,
      close,
    });
  } else {
    // Update the last item with more realistic changes
    const updateHigh = Math.max(lastItem.high, close + Math.random() * 1);
    const updateLow = Math.min(lastItem.low, close - Math.random() * 1);

    const updateCandle = {
      high: roundToTwoDecimals(updateHigh),
      low: roundToTwoDecimals(updateLow),
      close: roundToTwoDecimals(close),
      open: lastItem.open,
      timestamp: lastItem.timestamp,
      time: lastItem.time,
      _internal_originalTime: lastItem._internal_originalTime,
    };
    stock.dayTimeSeries[stock.dayTimeSeries.length - 1] = updateCandle;
  }

  // Keep only the last 390 minutes (6.5 hours) of data
  stock.dayTimeSeries = stock.dayTimeSeries.slice(-390);

  stock.currentPrice = close;
  try {
    await stock.save();
  } catch (error) {
    console.log("Skipping Conflicts");
  }
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
  const time = now.getTime() / 1000; //unix

  stock.tenMinTimeSeries.push({
    timestamp,
    time,
    _internal_originalTime: time,
    open: roundToTwoDecimals(currentPrice),
    high: roundToTwoDecimals(latestItem.high),
    low: roundToTwoDecimals(latestItem.low),
    close: roundToTwoDecimals(latestItem.close),
  });

  try {
    await stock.save();
  } catch (error) {
    console.log("Skipping Conflicts");
  }
};

module.exports = { generateStockData, store10Min };
