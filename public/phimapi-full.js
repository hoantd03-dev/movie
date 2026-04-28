/* =========================================
   PHIMAPI FULL – FINAL CLEAN VERSION
   ========================================= */

const API_BASE = "https://phimapi.com";
const API_V1   = "https://phimapi.com/v1/api";

let currentPage = 1;

/* =========================================
   CORE FETCH
   ========================================= */

async function callApi(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

function buildQuery(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
  );
  const query = new URLSearchParams(cleaned);
  return query.toString() ? `?${query.toString()}` : "";
}

/* =========================================
   LẤY FILTER TỪ URL
   ========================================= */

function getFilterOptions(params) {
  return {
    page:       parseInt(params.get("page")) || 1,
    sort_field: params.get("sort_field") || "modified.time",
    sort_type:  params.get("sort_type")  || "desc",
    sort_lang:  params.get("sort_lang")  || "",
    country:    params.get("country")    || "",
    year:       params.get("year")       || "",
    genre:   params.get("genre")      || "",
  };
}

/* =========================================
   API CALLS
   ========================================= */

async function getLatestMovies(page = 1) {
  return callApi(`${API_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`);
}

async function getMovieDetail(slug) {
  return callApi(`${API_BASE}/phim/${slug}`);
}

async function getList(type, options = {}) {
  return callApi(`${API_V1}/danh-sach/${type}${buildQuery({ limit: 24, ...options })}`);
}

async function searchMovies(keyword, options = {}) {
  return callApi(`${API_V1}/tim-kiem${buildQuery({ keyword, limit: 24, ...options })}`);
}

async function getCategoryDetail(slug, options = {}) {
  return callApi(`${API_V1}/the-loai/${slug}${buildQuery({ limit: 24, ...options })}`);
}

async function getCountryDetail(slug, options = {}) {
  return callApi(`${API_V1}/quoc-gia/${slug}${buildQuery({ limit: 24, ...options })}`);
}

async function getByYear(year, options = {}) {
  return callApi(`${API_V1}/nam/${year}${buildQuery({ limit: 24, ...options })}`);
}

async function getGenres() {
  return callApi(`${API_BASE}/the-loai`);
}

async function getCountries() {
  return callApi(`${API_BASE}/quoc-gia`);
}

/* =========================================
   IMAGE
   ========================================= */

function convertToWebp(url) {
  if (!url) return "https://dummyimage.com/300x450/ccc/000.jpg";
  if (url.startsWith("http"))     return url;
  if (url.startsWith("uploads"))  return "https://img.phimapi.com/" + url;
  if (url.startsWith("/uploads")) return "https://img.phimapi.com" + url;
  return "https://img.phimapi.com/" + url;
}

/* =========================================
   DATA NORMALIZER
   ========================================= */

function normalizeData(data, page = 1) {
  if (!data) {
    return { items: [], pagination: { currentPage: 1, totalPages: 1 } };
  }

  // API thường
  if (data.items) {
    return {
      items: data.items,
      pagination: {
        currentPage: data.pagination?.currentPage || page,
        totalPages:  data.pagination?.totalPages  || 1
      }
    };
  }

  // API V1
  if (data.data && data.data.items) {

    // ⚠️ FIX CHÍNH Ở ĐÂY
    const totalItems = data.data.params?.pagination?.totalItems || 0;
    const totalPages = data.data.params?.pagination?.totalPages || 1;
    const currentPage = data.data.params?.pagination?.currentPage || page;

    return {
      items: data.data.items,
      pagination: {
        currentPage,
        totalPages
      }
    };
  }

  // console.log("Pagination RAW:", data);

  return { items: [], pagination: { currentPage: 1, totalPages: 1 } };
}

/* =========================================
   PAGE TITLE
   ========================================= */

function getPageTitle(params) {
  const keyword = params.get("keyword");
  const type    = params.get("type");
  const genre   = params.get("genre");
  const country = params.get("country");
  const year    = params.get("year");

  if (keyword) return `Kết quả tìm kiếm: "${keyword}"`;

  if (type) {
    const el = document.querySelector(`#type option[value="${type}"]`);
    return el ? el.innerText : "Phim";
  }
  if (genre) {
    const el = document.querySelector(`#genre option[value="${genre}"]`);
    return el ? el.innerText : "Thể loại";
  }
  if (country) {
    const el = document.querySelector(`#country option[value="${country}"]`);
    return el ? el.innerText : "Quốc gia";
  }
  if (year) return `Phim năm ${year}`;

  return "Phim mới cập nhật";
}

/* =========================================
   SYNC FILTERS
   ========================================= */

function syncFilters() {
  const params = new URLSearchParams(window.location.search);
  const map = {
    type:       "type",
    genre:      "genre",
    country:    "country",
    year:       "year",
    sort_field: "sort_field",
    sort_type:  "sort_type",
    sort_lang:  "sort_lang",
    search:     "keyword",
  };

  Object.entries(map).forEach(([id, paramKey]) => {
    const el = document.getElementById(id);
    if (el) el.value = params.get(paramKey) || "";
  });
}

function renderSelect(id, list, isYear = false) {
  const el = document.getElementById(id);

  el.innerHTML = `<option value="">${el.dataset.placeholder || "-- Chọn --"}</option>`;

  list.forEach(item => {
    const option = document.createElement("option");

    if (isYear) {
      option.value = item;
      option.textContent = item;
    } else {
      option.value = item.slug;
      option.textContent = item.name;
    }

    el.appendChild(option);
  });
}

async function initFilters() {
  try {
    // loading state
    ["genre", "country"].forEach(id => {
      document.getElementById(id).innerHTML = `<option>Đang tải...</option>`;
    });


    const [genresRes, countriesRes] = await Promise.all([
      getGenres(),
      getCountries()
    ]);

    // console.log("Genres raw:", genresRes);
    // console.log("Countries raw:", countriesRes);

    // ⚠️ phimapi trả dạng data.items
    const genres = genresRes || [];
    const countries = countriesRes || [];

    renderSelect("genre", genres);
    renderSelect("country", countries);

    // YEAR tự generate
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
    renderSelect("year", years, true);

    // TYPE (có thể giữ fix hoặc cũng render)
    renderSelect("type", [
      { name: "Phim lẻ", slug: "phim-le" },
      { name: "Phim bộ", slug: "phim-bo" },
      { name: "Anime",  slug: "hoat-hinh" }
    ]);

    // sync lại value từ URL sau khi render xong
    syncFilters();

  } catch (err) {
    console.error("Init filter lỗi:", err);
  }
}



/* =========================================
   APPLY FILTER
   ========================================= */

async function applyFilter() {
  const type       = document.getElementById("type").value;
  const genre      = document.getElementById("genre").value;
  const country    = document.getElementById("country").value;
  const year       = document.getElementById("year").value;
  const keyword    = document.getElementById("search").value.trim();
  // const sort_field = document.getElementById("sort_field").value;
  // const sort_type  = document.getElementById("sort_type").value;
  // const sort_lang  = document.getElementById("sort_lang").value;

  const params = new URLSearchParams();

  if (keyword) params.set("keyword", keyword);
  if (type)    params.set("type", type);
  if (genre)   params.set("genre", genre);
  if (country) params.set("country", country);
  if (year)    params.set("year", year);

  // if (sort_field) params.set("sort_field", sort_field);
  // if (sort_type)  params.set("sort_type",  sort_type);
  // if (sort_lang)  params.set("sort_lang",  sort_lang);

  window.location.search = params.toString();
}

/* =========================================
   RENDER MOVIES LIST
   ========================================= */

function renderMovies(items = []) {
  const movieList   = document.getElementById("movie-list");
  const movieDetail = document.getElementById("movie-detail");
  const pagination  = document.getElementById("pagination");

  movieDetail.style.display = "none";
  movieList.style.display   = "grid";
  pagination.style.display  = "block";
  movieList.innerHTML = "";

  if (!items.length) {
    movieList.innerHTML = "<p>Không có dữ liệu</p>";
    return;
  }

  items.forEach(movie => {
    const imageUrl = convertToWebp(movie.thumb_url || movie.poster_url);
    movieList.innerHTML += `
      <div class="movie-card">
        <a href="?slug=${movie.slug}">
          <img src="${imageUrl}" loading="lazy"/>
          <h3>${movie.name}</h3>
          <p>${movie.year || ""}</p>
        </a>
      </div>
    `;
  });
}

/* =========================================
   RENDER MOVIE DETAIL
   ========================================= */

function renderMovieDetail(data) {
  if (!data || !data.movie) return;

  const movieList   = document.getElementById("movie-list");
  const movieDetail = document.getElementById("movie-detail");
  const pagination  = document.getElementById("pagination");
  const pageTitle   = document.getElementById("page-title");
  document.title = data.movie.name + " | Movie Server";

  movieList.style.display   = "none";
  pagination.style.display  = "none";
  movieDetail.style.display = "block";

  const movie    = data.movie;
  const episodes = data.episodes || [];

  pageTitle.innerText     = movie.name;
  window.currentMovieSlug = movie.slug;
  window.currentMovieName = movie.name; // ← thêm cạnh currentMovieSlug

  const params        = new URLSearchParams(window.location.search);
  const currentEp     = params.get("ep");
  const currentServer = params.get("server");

  let selectedEpisode    = null;
  let selectedServerName = null;
  let selectedBtnId      = null;

  const vietsubServer = episodes.find(s =>
    s.server_name.toLowerCase().includes("vietsub")
  );

  movieDetail.innerHTML = `
    <div class="detail-page">
      <h1>${movie.name}</h1>
      <p>${movie.content || ""}</p>
      <div id="video-player"></div>
      <div class="server-wrapper">
        ${episodes.map((server, sIndex) => `
          <div class="server-block">
            <h3>${server.server_name}</h3>
            <div class="episode-list">
              ${(server.server_data || []).map((ep, eIndex) => {
                const btnId    = `ep-${sIndex}-${eIndex}`;
                const isActive =
                  ep.name === currentEp &&
                  server.server_name === currentServer;

                if (isActive && !selectedEpisode) {
                  selectedEpisode    = ep;
                  selectedServerName = server.server_name;
                  selectedBtnId      = btnId;
                }

                return `
                  <button
                    id="${btnId}"
                    class="${isActive ? 'active-ep' : ''}"
                    onclick="playEpisode(
                      '${ep.link_m3u8}',
                      this,
                      '${ep.name}',
                      '${server.server_name}'
                    )">
                    ${ep.name}
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  if (!selectedEpisode) {
    if (vietsubServer && vietsubServer.server_data?.length) {
      selectedEpisode    = vietsubServer.server_data[0];
      selectedServerName = vietsubServer.server_name;
      selectedBtnId      = "ep-0-0";
    } else if (episodes[0]?.server_data?.length) {
      selectedEpisode    = episodes[0].server_data[0];
      selectedServerName = episodes[0].server_name;
      selectedBtnId      = "ep-0-0";
    }
  }

  if (selectedEpisode) {
    const btn = document.getElementById(selectedBtnId);
    playEpisode(
      selectedEpisode.link_m3u8,
      btn,
      selectedEpisode.name,
      selectedServerName
    );
  }
}

/* =========================================
   VIDEO PLAYER
   ========================================= */
// ===== ĐẶT 2 BIẾN NÀY Ở NGOÀI, CÙNG CẤP VỚI `let hls = null` =====
let hls = null;
let progressController = null;  // ← THÊM VÀO ĐÂY

function playEpisode(url, btn, epName, serverName) {

  var videoContainer = document.getElementById("video-player");

if (!document.getElementById("video")) {

  videoContainer.innerHTML =
    '<div style="position:relative;background:black;">' +
      '<video id="video" controls autoplay playsinline webkit-playsinline preload="auto" style="width:100%;background:black;"></video>' +

      '<button id="pipBtn" style="position:absolute;top:10px;left:10px;padding:8px;background:rgba(0,0,0,0.6);color:white;border:none;">📺 PiP</button>' +

      '<button id="back10" style="position:absolute;bottom:60px;left:20px;padding:10px;background:rgba(0,0,0,0.6);color:white;border:none;">⏪ 10s</button>' +

      '<button id="forward10" style="position:absolute;bottom:60px;right:20px;padding:10px;background:rgba(0,0,0,0.6);color:white;border:none;">10s ⏩</button>' +

      '<div id="quality-selector" class="quality-box" style="position:absolute;top:10px;right:10px;"></div>' +
    '</div>';

}
 const video = document.getElementById("video");
const slug    = window.currentMovieSlug || "movie";
const episode = epName;
const progressKey = `progress_${slug}_${episode}`;

// Hủy listener tập trước
if (progressController) progressController.abort();
progressController = new AbortController();
const { signal } = progressController;

// Lưu progress mỗi 5s
let lastSave = 0;
video.addEventListener("timeupdate", () => {
  if (video.currentTime - lastSave < 5) return;
  lastSave = video.currentTime;
  localStorage.setItem(progressKey, video.currentTime);
}, { signal });

// Resume progress sau khi load xong — once: true để không stack
video.addEventListener("loadedmetadata", () => {
  const saved = localStorage.getItem(progressKey);
  if (saved) video.currentTime = parseFloat(saved);
}, { once: true });

  var qualityBox = document.getElementById("quality-selector");

  const pipBtn = document.getElementById("pipBtn");

  if (pipBtn) {
    pipBtn.onclick = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.log("PiP không hỗ trợ:", e);
    }
  }; }

  // ===== TUA 10s =====
  document.getElementById("back10").onclick = function () {
    if (!video.duration) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  document.getElementById("forward10").onclick = function () {
    console.log("clicked");
    if (!video.duration) return;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  };

  if (!window.keyboardAdded) {

    document.addEventListener("keydown", function (e) {

      const video = document.getElementById("video");
      if (!video || !video.duration) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        video.currentTime -= 10;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        video.currentTime += 10;
      }

    });

    window.keyboardAdded = true;
  }

  // ===== Highlight tập =====
  document.querySelectorAll(".episode-list button")
    .forEach(b => b.classList.remove("active-ep"));

  if (btn) btn.classList.add("active-ep");

  // ===== Lưu URL =====
  if (epName && serverName) {
    const params = new URLSearchParams(window.location.search);
    params.set("ep", epName);
    params.set("server", serverName);
    window.history.replaceState({}, "", "?" + params.toString());
    document.title = `${epName} - ${window.currentMovieName} | Movie Server`; // ← thêm dòng này 
  }

  console.log("🎬 Playing:", serverName, epName);
  console.log("🔗 Stream URL:", url);

  

// ===== NATIVE CHỈ KHI KHÔNG CÓ HLS.JS =====
  if (!Hls.isSupported() &&
      video.canPlayType('application/vnd.apple.mpegurl')) {

    console.log("📺 Using Native HLS (no MSE support)");

    video.src = url;

    video.addEventListener("loadedmetadata", function () {
      video.play().catch(() => {});
    }, { once: true });

    qualityBox.innerHTML = "";
    return;
  }

  // ===== HLS.JS =====
  if (Hls.isSupported()) {

    if (hls) {
      hls.destroy();
      hls = null;
    }

    hls = new Hls({
        // Buffer
        maxBufferLength: 120,
        maxMaxBufferLength: 240,
        maxBufferSize: 100 * 1000 * 1000,
        backBufferLength: 60,

        // Retry khi load chậm
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetryTimeout: 64000,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,

        // Performance
        enableWorker: true,
        lowLatencyMode: false,
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    // ===== LOG EVENT =====
    hls.on(Hls.Events.MANIFEST_PARSED, function () {

      console.log("📦 Manifest loaded");
      const levels = hls.levels;
      const savedQuality = localStorage.getItem("preferredQuality");

      let html = `<button data-level="-1">Auto</button>`;

      levels.forEach((level, index) => {
        html += `<button data-level="${index}">${level.height}p</button>`;
      });

      qualityBox.innerHTML = html;

      const buttons = qualityBox.querySelectorAll("button");

      buttons.forEach(b => {
        b.addEventListener("click", function () {

          const level = parseInt(this.dataset.level);
          hls.currentLevel = level;
          localStorage.setItem("preferredQuality", level);

          buttons.forEach(x => x.classList.remove("active-quality"));
          this.classList.add("active-quality");

          console.log("🎚 Switched quality:", level);
        });
      });

      if (savedQuality !== null) {
        hls.currentLevel = parseInt(savedQuality);
        const activeBtn = qualityBox.querySelector(
          `button[data-level="${savedQuality}"]`
        );
        if (activeBtn) activeBtn.classList.add("active-quality");
      } else {
        qualityBox.querySelector(`button[data-level="-1"]`)
          .classList.add("active-quality");
      }

    });

    // ===== ERROR HANDLING =====
    hls.on(Hls.Events.ERROR, function (event, data) {

      console.log("❌ HLS Error:", data);

      if (data.fatal) {

        switch (data.type) {

          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log("🔁 Network error → retrying...");
            hls.startLoad();
            break;

          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log("🔁 Media error → recovering...");
            hls.recoverMediaError();
            break;

          default:
            console.log("💥 Fatal error → destroy player");
            hls.destroy();
            break;
        }
      }
    });

    // ===== LOG BUFFER =====
    video.addEventListener("waiting", () => {
      console.log("⏳ Buffering...");
    });

    video.addEventListener("playing", () => {
      console.log("▶ Playing...");
    });

    video.addEventListener("seeking", () => {
      console.log("⏩ Seeking...");
    });

  } else {
    console.log("📺 No MSE support → Native");
    video.src = url;
    video.addEventListener("error", function () {
      video.src = url.replace(".m3u8", ".mp4");
    }, { once: true });
  }
}

/* =========================================
   PAGINATION
   ========================================= */

function renderPagination(pagination) {
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  const totalPages = pagination.totalPages  || 1;
  currentPage      = pagination.currentPage || 1;

  if (totalPages <= 1) return;

  const start = Math.max(1, currentPage - 2);
  const end   = Math.min(totalPages, start + 4);

  if (currentPage > 1) {
    container.innerHTML += `<button onclick="goPage(${currentPage - 1})">«</button>`;
  }

  for (let i = start; i <= end; i++) {
    container.innerHTML += `
      <button onclick="goPage(${i})" class="${i === currentPage ? 'active-page' : ''}">
        ${i}
      </button>
    `;
  }

  if (end < totalPages) {
    container.innerHTML += `<span>...</span>`;
    container.innerHTML += `<button onclick="goPage(${totalPages})">${totalPages}</button>`;
  }

  if (currentPage < totalPages) {
    container.innerHTML += `<button onclick="goPage(${currentPage + 1})">»</button>`;
  }
}

/* =========================================
   PAGE CHANGE
   ========================================= */

function goPage(page) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", page);
  window.location.search = params.toString();
}

/* =========================================
   ROUTER
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  await initFilters(); // 🔥 thêm dòng này
  const params  = new URLSearchParams(window.location.search);
  const slug    = params.get("slug");
  const keyword = params.get("keyword");
  const type    = params.get("type");
  const genre   = params.get("genre");
  const country = params.get("country");
  const year    = params.get("year");

  document.getElementById("page-title").innerText = getPageTitle(params);

  if (slug) {
    const detail = await getMovieDetail(slug);
    renderMovieDetail(detail);
    return;
  }

  

  const opts = getFilterOptions(params);
let rawData;

const hasFilter =
  params.get("type") ||
  params.get("genre") ||
  params.get("country") ||
  params.get("year");

if (keyword) {

  // 🔍 SEARCH → API V1
  rawData = await searchMovies(keyword, {
    page: opts.page,
    // sort_field: opts.sort_field,
    // sort_type: opts.sort_type,
    // sort_lang: opts.sort_lang,
    genre: opts.genre,
    country: opts.country,
    year: opts.year,
  });

} else if (!hasFilter) {

  // 🏠 TRANG CHỦ → API thường
  rawData = await getLatestMovies(opts.page);

} else if (params.get("type")) {

  // 🎯 Có type → dùng đúng type
  rawData = await getList(params.get("type"), {
    page: opts.page,
    // sort_field: opts.sort_field,
    // sort_type: opts.sort_type,
    // sort_lang: opts.sort_lang,
    genre: opts.genre,
    country: opts.country,
    year: opts.year,
  });

} else {

  // ⚠️ Có filter nhưng không có type → fallback hợp lệ
  rawData = await getList("phim-le", {
    page: opts.page,
    // sort_field: opts.sort_field,
    // sort_type: opts.sort_type,
    // sort_lang: opts.sort_lang,
    genre: opts.genre,
    country: opts.country,
    year: opts.year,
  });

}

const { items, pagination } = normalizeData(rawData, opts.page);
renderMovies(items);
renderPagination(pagination);
// Trong phần router, sau khi có params
document.title = getPageTitle(params) + " | Movie Server";
});