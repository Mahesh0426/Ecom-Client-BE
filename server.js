import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import dbConnect from "./src/config/dbconfig.js";
import { responseClient } from "./src/middleware/responseClient.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import authRoute from "./src/routes/authRoute.js";
import imageRoutes from "./src/routes/imageRoute.js";
import productRouter from "./src/routes/productRoutes.js";
import categoryRouter from "./src/routes/categoryRoutes.js";
import reviewRouter from "./src/routes/reviewRoute.js";
import couponRouter from "./src/routes/couponRoutes.js";
import webhookRouter from "./src/routes/stripeWebhook.js";
import stripeRouter from "./src/routes/stripe.js";

const app = express();
const PORT = process.env.PORT || 8001;

// 1. Register webhook route FIRST
app.use("/api/v1/webhook", webhookRouter);

// 2. Now add your other middleware
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/v1/webhook")) {
    next(); // skip express.json() for webhook
  } else {
    express.json()(req, res, next);
  }
});

//Middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(morgan("dev"));
// app.use(express.json());

//API endpoints
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/payment", stripeRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/coupons", couponRouter);

//end poins for image
app.use("/api/v1/all", imageRoutes);

app.use(errorHandler); // To handle errors globally in the application

//DB Connection and Server status
dbConnect()
  .then(() => {
    /** ready to use. The `mongoose.connect()` promise resolves to mongoose
    instance. */
    app.listen(PORT, (error) => {
      return !error
        ? console.log(`server is running at http://localhost:${PORT}`)
        : console.log(error);
    });
  })
  .catch((error) => console.log(error));

// To define a route handler for GET requests to the root URL ("/"):
app.get("/", (req, res) => {
  const message = " Welcome to the server, Its LIVE now";
  responseClient({ req, res, message }); // To send a response to the client
});
