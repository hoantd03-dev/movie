const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = 3000;
const PASSWORD = "123456";

// ==============================
// Middleware kiểm tra mật khẩu
// ==============================
app.use((req, res, next) => {
  const pass = req.query.pass;

  console.log("==== REQUEST ====");
  console.log("URL:", req.originalUrl);
  console.log("PASS:", pass);

  if (pass !== PASSWORD) {
    console.log("❌ Sai mật khẩu");
    return res.status(403).json({ error: "Forbidden" });
  }

  console.log("✅ Đúng mật khẩu");
  next();
});

// ==============================
// Header giả lập trình duyệt
// ==============================
const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
  "Connection": "keep-alive"
};

// ==============================
// API lấy danh sách phim
// ==============================
app.get("/movies", async (req, res) => {
  const page = req.query.page || 1;
  const url = `https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`;

  console.log("📡 Gọi API:", url);

  try {
    const response = await fetch(url, {
      headers: browserHeaders
    });

    console.log("Status:", response.status);

    const text = await response.text();
    console.log("Raw response (1000 ký tự đầu):");
    console.log(text.substring(0, 1000));

    if (!response.ok) {
      return res.status(response.status).json({
        error: "API phimapi trả lỗi",
        status: response.status
      });
    }

    const data = JSON.parse(text);
    res.json(data);

  } catch (err) {
    console.log("🔥 Lỗi thật sự:");
    console.log(err);
    res.status(500).json({ error: "Lỗi lấy danh sách phim" });
  }
});

// ==============================
// API lấy chi tiết phim
// ==============================
app.get("/movie/:slug", async (req, res) => {
  const slug = req.params.slug;
  const url = `https://phimapi.com/phim/${slug}`;

  console.log("📡 Gọi API:", url);

  try {
    const response = await fetch(url, {
      headers: browserHeaders
    });

    console.log("Status:", response.status);

    const text = await response.text();
    console.log("Raw response (1000 ký tự đầu):");
    console.log(text.substring(0, 1000));

    if (!response.ok) {
      return res.status(response.status).json({
        error: "API phimapi trả lỗi",
        status: response.status
      });
    }

    const data = JSON.parse(text);
    res.json(data);

  } catch (err) {
    console.log("🔥 Lỗi thật sự:");
    console.log(err);
    res.status(500).json({ error: "Lỗi lấy chi tiết phim" });
  }
});

// ==============================
// Server chạy
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});