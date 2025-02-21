import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import organizationRoutes from "./routes/organization.route.js";
import userRoutes from "./routes/user.route.js";

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

app.use("/api/v1/test", testRoute);
app.use("/api/v1/ai", geminiRoute);

app.use("/api/v1/organization",organizationRoutes);
app.use("/api/v1/user", userRoutes);

export { app };