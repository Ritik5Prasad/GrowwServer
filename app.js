require('dotenv').config();
require("express-async-errors");

// Swagger
const swaggerUI = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/swagger.yaml');

const express = require("express");
const connectDB = require("./config/connect");
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

const app = express();
app.use(express.json());
const authenticateUser = require("./middleware/authentication");

app.get("/", (req, res) => {
  res.send('<h1>Groww Clone API</h1><a href="/api-docs">Documentation</a>');
});
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// routers
const authRouter = require("./routes/auth");
const stockRouter = require("./routes/stocks");

app.use("/auth", authRouter);
app.use("/stocks", authenticateUser, stockRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
