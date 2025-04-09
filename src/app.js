import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import testRoute from "./routes/test.route.js";
import geminiRoute from "./routes/gemini.route.js";
import complaintsRoute from "./routes/complaints.route.js";
import userRoutes from "./routes/user.route.js";
import channelRoutes from "./routes/channel.route.js";

app.use("/api/v1/test", testRoute);
app.use("/api/v1/ai", geminiRoute);
app.use("/api/v1/complaints", complaintsRoute);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/channels", channelRoutes);

export { app };