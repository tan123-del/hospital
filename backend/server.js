const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// 1. CORS: allow any origin (the cors middleware also answers OPTIONS preflight requests itself)
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: false,
  })
);

// 2. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Health check (does not need the database)
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Smart Hospital API is operational" });
});

// 4. MongoDB connection, cached so it is reused between serverless invocations on Vercel
let connectionPromise = null;
function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!process.env.MONGO_URI) {
    return Promise.reject(new Error("MONGO_URI is not set in the environment variables"));
  }
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .then(() => console.log("MongoDB connected successfully"))
      .catch((err) => {
        connectionPromise = null; // allow a retry on the next request
        throw err;
      });
  }
  return connectionPromise;
}

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    res.status(500).json({ message: "Database connection failed: " + err.message });
  }
});

// 5. API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/hospitals", require("./routes/hospitalRoutes"));
app.use("/api/queue", require("./routes/QueueRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// 6. 404 fallback (CORS headers are already applied by the middleware above)
app.use((req, res) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
});

// 7. Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

// 8. Local development only (Vercel imports the exported app instead)
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
