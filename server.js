const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

const PORT = 3000;
const PASSWORD = "123456";

// ==============================
// Serve Frontend (KHÔNG yêu cầu pass)
// ==============================
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
// ==============================
// Middleware kiểm tra mật khẩu (chỉ áp dụng cho API)
// ==============================
function checkPassword(req, res, next) {
  const pass = req.query.pass;

  if (pass !== PASSWORD) {
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

  console.log("📡 API:", url);

  try {
    const response = await axios.get(url, {
      headers: browserHeaders,
    });

    res.json(response.data);
  } catch (err) {
    console.log("🔥 Lỗi:", err.message);
    res.status(500).json({ error: "Lỗi lấy dữ liệu" });
  }
});
// ==============================
// API lấy chi tiết phim
// ==============================
app.get("/movie/:slug", checkPassword, async (req, res) => {
  const slug = req.params.slug;
  const url = `https://phimapi.com/phim/${slug}`;

  console.log("📡 Gọi API:", url);

  try {
    const response = await axios.get(url, {
      headers: browserHeaders,
    });

    res.json(response.data);
  } catch (err) {
    console.log("🔥 Lỗi:", err.message);
    res.status(500).json({ error: "Lỗi lấy chi tiết phim" });
  }
});

// ==============================
// Server chạy
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});