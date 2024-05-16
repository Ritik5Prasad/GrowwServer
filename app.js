require("dotenv").config();
require("express-async-errors");

const express = require("express");
const connectDB = require("./config/connect");
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");
const {
  scheduleDayReset,
  update10minCandle,
  generateRandomDataEvery5Second,
} = require("./services/cronJob");

scheduleDayReset();
generateRandomDataEvery5Second();
update10minCandle();

const Stock = require("./models/Stock");

const app = express();
app.use(express.json());
const authenticateSocketUser = require("./middleware/socketAuth");
const socketHandshake = require("./middleware/socketHandshake");

const holidays = ["2024-05-18", "2024-05-31"];

const isTradingHour = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const isWeekday = dayOfWeek > 0 && dayOfWeek < 6; // Monday to Friday
  const isTradingTime = now.getHours() >= 9 && now.getHours() < 15; // 9:30 AM to 3:30 PM
  const today = new Date().toISOString().slice(0, 10);
  return isWeekday && isTradingTime && !holidays.includes(today);
};

const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
    allowedHeaders: ["access_token"],
    credentials: true,
  },
});
io.use(socketHandshake);

io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("subscribeToStocks", async (stocks) => {
    console.log("Client subscribed to stocks:", stocks);
    const sendUpdates = async () => {
      try {
        for (const stockSymbol of stocks) {
          const stock = await Stock.findOne({ symbol: stockSymbol });
          if (!stock) {
            console.log(`Stock '${stockSymbol}' not found`);
          } else {
            socket.emit("stockData", stock);
          }
        }
      } catch (error) {
        console.error("Error fetching stock data:", error);
      }
    };
    sendUpdates();

    const intervalId = setInterval(sendUpdates, 5000);

    if (!isTradingHour()) {
      clearInterval(intervalId);
    }
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

// Log WebSocket server status
httpServer.listen(process.env.SOCKET_PORT || 4000, () => {
  console.log(
    "WebSocket server is running and listening on port 🔌🔌🔌",
    httpServer.address().port
  );
});

app.get("/", (req, res) => {
  res.send('<h1>Groww Clone API</h1><a href="/api-docs">Documentation</a>');
});

// Handle Swagger API documentation
const swaggerUI = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./docs/swagger.yaml");
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// Routers
const authRouter = require("./routes/auth");
const stockRouter = require("./routes/stocks");

app.use("/auth", authRouter);
app.use("/stocks", authenticateSocketUser, stockRouter);

// Middleware
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// Start the server
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(process.env.PORT || 3000, () =>
      console.log(`HTTP server is running on port ${process.env.PORT || 3000}`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
