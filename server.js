// 

const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

const PORT = 3000;
const PASSWORD = "123456";

// ==============================
// Serve Frontend
// ==============================
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ==============================
// Middleware kiểm tra mật khẩu
// ==============================
function checkPassword(req, res, next) {
  const pass = req.query.pass;

  if (pass !== PASSWORD) {
    console.log("⛔ Sai mật khẩu từ IP:", req.ip);
    return res.status(403).json({ error: "Forbidden - Sai mật khẩu" });
  }

  next();
}

// ==============================
// Header giả lập trình duyệt
// ==============================
const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
  Connection: "keep-alive",
};

// ==============================
// Axios instance có timeout
// ==============================
const api = axios.create({
  timeout: 10000, // 10 giây
  headers: browserHeaders,
});

// ==============================
// Interceptor log thời gian
// ==============================
api.interceptors.request.use((config) => {
  config.metadata = { startTime: new Date() };
  console.log("\n==============================");
  console.log("👉 CALL API:", config.url);
  console.log("🕒 Time:", new Date().toISOString());
  return config;
});

api.interceptors.response.use(
  (response) => {
    const duration =
      new Date() - response.config.metadata.startTime;

    console.log("✅ SUCCESS:", response.config.url);
    console.log("📊 Status:", response.status);
    console.log("⏱ Duration:", duration + "ms");
    console.log("==============================\n");

    return response;
  },
  (error) => {
    if (error.config && error.config.metadata) {
      const duration =
        new Date() - error.config.metadata.startTime;

      console.log("❌ ERROR:", error.config.url);
      console.log("⏱ Duration:", duration + "ms");
    }

    if (error.code === "ECONNABORTED") {
      console.log("⛔ TIMEOUT - API phản hồi quá chậm");
    }

    if (error.response) {
      console.log("📊 Status:", error.response.status);
      console.log("📦 Data:", error.response.data);
    }

    console.log("🔥 Message:", error.message);
    console.log("==============================\n");

    return Promise.reject(error);
  }
);

// ==============================
// API lấy danh sách phim
// ==============================
app.get("/movies", checkPassword, async (req, res) => {
  const page = req.query.page || 1;
  const category = req.query.category || "phim-moi-cap-nhat";
  const keyword = req.query.keyword || "";

  let url = "";

  if (keyword) {
    url = `https://phimapi.com/v1/api/tim-kiem?keyword=${keyword}&page=${page}`;
  } else {
    url = `https://phimapi.com/danh-sach/${category}?page=${page}`;
  }

  try {
    const response = await api.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: "Lỗi lấy dữ liệu",
      message: err.message,
    });
  }
});

// ==============================
// API lấy chi tiết phim
// ==============================
app.get("/movie/:slug", checkPassword, async (req, res) => {
  const slug = req.params.slug;
  const url = `https://phimapi.com/phim/${slug}`;

  try {
    const response = await api.get(url);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      error: "Lỗi lấy chi tiết phim",
      message: err.message,
    });
  }
});

// ==============================
// Route kiểm tra API sống hay chết
// ==============================
app.get("/health", async (req, res) => {
  try {
    const start = Date.now();
    await api.get("https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1");
    const duration = Date.now() - start;

    res.json({
      status: "API OK",
      responseTime: duration + "ms",
    });
  } catch (err) {
    res.json({
      status: "API FAIL",
      error: err.message,
    });
  }
});

// ==============================
// Bắt lỗi hệ thống
// ==============================
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// ==============================
// Server chạy
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});