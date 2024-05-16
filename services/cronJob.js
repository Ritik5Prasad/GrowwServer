const cron = require("node-cron");
const Stock = require("../models/Stock");
const { store10Min, generateStockData } = require("./stockUtils");

const holidays = ["2024-05-18", "2024-05-31"];

const isTradingHour = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const isWeekday = dayOfWeek > 0 && dayOfWeek < 6; // Monday to Friday
  const isTradingTime = now.getHours() >= 9 && now.getHours() < 15; // 9:30 AM to 3:30 PM
  const today = new Date().toISOString().slice(0, 10);
  return isWeekday && isTradingTime && !holidays.includes(today);
};

const isNewTradeDay = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const isWeekday = dayOfWeek > 0 && dayOfWeek < 6; // Monday to Friday
  const today = new Date().toISOString().slice(0, 10);
  return isWeekday && !holidays.includes(today);
};

const scheduleDayReset = () => {
  cron.schedule("15 9 * * 1-5", async () => {
    if (isNewTradeDay()) {
      await Stock.updateMany(
        {},
        {
          $set: {
            dayTimeSeries: [],
            tenMinTimeSeries: [],
            lastDayTradedPrice: { $set: "$currentPrice" },
          },
        }
      );
      console.log("Day reset completed at 9:15 AM");
    }
  });
};

const update10minCandle = () => {
  cron.schedule("*/10 * * * *", async () => {
    if (isTradingHour()) {
      const stock = await Stock.find();
      stock.forEach(async (s) => {
        await store10Min(s.symbol);
        console.log("10 min candle updated");
      });
    }
  });
};

const generateRandomDataEvery5Second = () => {
  cron.schedule("*/5 * * * * *", async () => {
    if (isTradingHour()) {
      const stock = await Stock.find();
      stock.forEach(async (s) => {
        await generateStockData(s.symbol);
        console.log("Realtime Updates");
      });
    }
  });
};

module.exports = {
  scheduleDayReset,
  update10minCandle,
  generateRandomDataEvery5Second,
};
