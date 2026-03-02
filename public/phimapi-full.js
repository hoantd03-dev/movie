/* =========================================
   PHIMAPI FULL – FINAL CLEAN VERSION
   ========================================= */

const API_BASE = "https://phimapi.com";
const API_V1 = "https://phimapi.com/v1/api";

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
  const query = new URLSearchParams(params);
  return query.toString() ? `?${query.toString()}` : "";
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
  return callApi(`${API_V1}/danh-sach/${type}${buildQuery({ limit:24, ...options })}`);
}

async function searchMovies(keyword, options = {}) {
  return callApi(`${API_V1}/tim-kiem${buildQuery({ keyword, limit:24, ...options })}`);
}

async function getCategoryDetail(slug, options = {}) {
  return callApi(`${API_V1}/the-loai/${slug}${buildQuery({ limit:24, ...options })}`);
}

async function getCountryDetail(slug, options = {}) {
  return callApi(`${API_V1}/quoc-gia/${slug}${buildQuery({ limit:24, ...options })}`);
}

async function getByYear(year, options = {}) {
  return callApi(`${API_V1}/nam/${year}${buildQuery({ limit:24, ...options })}`);
}

/* =========================================
   IMAGE
   ========================================= */

function convertToWebp(url) {
  if (!url) return "https://dummyimage.com/300x450/ccc/000.jpg";

  if (url.startsWith("http")) return url;
  if (url.startsWith("uploads")) return "https://img.phimapi.com/" + url;
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

  // Trường hợp API danh sách thường
  if (data.items) {
    return {
      items: data.items,
      pagination: {
        currentPage: data.pagination?.currentPage || page,
        totalPages: data.pagination?.totalPages || 1
      }
    };
  }

  // Trường hợp API v1 (search, category, year...)
  if (data.data && data.data.items) {

    const pg =
      data.data.params?.pagination ||
      data.data.pagination ||
      {};

    return {
      items: data.data.items,
      pagination: {
        currentPage: pg.current_page || page,
        totalPages: pg.total_pages || 1
      }
    };
  }

  return { items: [], pagination: { currentPage: 1, totalPages: 1 } };
}

/* =========================================
   RENDER MOVIES LIST
   ========================================= */

function renderMovies(items = [], title = "Phim mới cập nhật") {

  const movieList = document.getElementById("movie-list");
  const movieDetail = document.getElementById("movie-detail");
  const pagination = document.getElementById("pagination");
  const pageTitle = document.getElementById("page-title");

  movieDetail.style.display = "none";
  movieList.style.display = "grid";
  pagination.style.display = "block";

  pageTitle.innerText = title;

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

  const movieList = document.getElementById("movie-list");
  const movieDetail = document.getElementById("movie-detail");
  const pagination = document.getElementById("pagination");
  const pageTitle = document.getElementById("page-title");

  movieList.style.display = "none";
  pagination.style.display = "none";
  movieDetail.style.display = "block";

  const movie = data.movie;
  const episodes = data.episodes || [];

  pageTitle.innerText = movie.name;

  const params = new URLSearchParams(window.location.search);
  const currentEp = params.get("ep");
  const currentServer = params.get("server");

  let selectedEpisode = null;
  let selectedServerName = null;
  let selectedBtnId = null;

  // ===== ƯU TIÊN VIETSUB =====
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

                const btnId = `ep-${sIndex}-${eIndex}`;

                const isActive =
                  ep.name === currentEp &&
                  server.server_name === currentServer;

                // Nếu có URL → dùng URL
                if (isActive && !selectedEpisode) {
                  selectedEpisode = ep;
                  selectedServerName = server.server_name;
                  selectedBtnId = btnId;
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

  // ===== Nếu không có URL → tự chọn Vietsub tập 1 =====
  if (!selectedEpisode) {

    if (vietsubServer && vietsubServer.server_data?.length) {
      selectedEpisode = vietsubServer.server_data[0];
      selectedServerName = vietsubServer.server_name;
      selectedBtnId = "ep-0-0"; // thường vietsub là server đầu
    }
    else if (episodes[0]?.server_data?.length) {
      selectedEpisode = episodes[0].server_data[0];
      selectedServerName = episodes[0].server_name;
      selectedBtnId = "ep-0-0";
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
   VIDEO PLAYER – OPTIMIZED VERSION
========================================= */

let hls = null;

function playEpisode(url, btn = null, epName = null, serverName = null) {

  const videoContainer = document.getElementById("video-player");

  videoContainer.innerHTML = `
    <div class="player-wrapper">
      <video id="video"
             controls
             autoplay
             playsinline
             webkit-playsinline
             preload="auto"
             style="width:100%;background:black">
      </video>
      <div id="quality-selector" class="quality-box"></div>
    </div>
  `;

  const video = document.getElementById("video");
  const qualityBox = document.getElementById("quality-selector");

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
  }

  console.log("🎬 Playing:", serverName, epName);
  console.log("🔗 Stream URL:", url);

  // ===== ƯU TIÊN NATIVE HLS (TV / Safari) =====
  if (video.canPlayType('application/vnd.apple.mpegurl')) {

    console.log("📺 Native HLS detected (TV/Safari)");

    video.src = url;
    video.play().catch(e => console.log("Autoplay blocked:", e));
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

      // 🔥 TỐI ƯU CHỐNG LAG
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      maxBufferSize: 60 * 1000 * 1000,
      backBufferLength: 30,

      // 🔥 Retry network
      fragLoadingTimeOut: 15000,
      fragLoadingMaxRetry: 6,
      manifestLoadingMaxRetry: 4,
      levelLoadingMaxRetry: 4,

      // 🔥 Performance
      enableWorker: true,
      lowLatencyMode: false,
      capLevelToPlayerSize: true,
      startLevel: -1

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

  }
  else {

    console.log("📺 No MSE support → Try native direct HLS first");

    // 🔥 Thử phát m3u8 trực tiếp (TV browser rất hay cần cách này)
    video.src = url;

    video.addEventListener("error", function () {

      console.log("⚠ Native HLS failed → fallback MP4");

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

  const totalPages = pagination.totalPages || 1;
  currentPage = pagination.currentPage || 1;

  if (totalPages <= 1) return;

  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);

  if (currentPage > 1) {
    container.innerHTML += `<button onclick="goPage(${currentPage - 1})">«</button>`;
  }

  for (let i = start; i <= end; i++) {
    container.innerHTML += `
      <button onclick="goPage(${i})"
        class="${i === currentPage ? "active-page" : ""}">
        ${i}
      </button>
    `;
  }

  // 👉 luôn hiển thị trang cuối nếu chưa có
  if (end < totalPages) {
    container.innerHTML += `<span>...</span>`;
    container.innerHTML += `<button onclick="goPage(${totalPages})">${totalPages}</button>`;
  }

  if (currentPage < totalPages) {
    container.innerHTML += `<button onclick="goPage(${currentPage + 1})">»</button>`;
  }
}
/* =========================================
   ROUTER
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);

  const slug = params.get("slug");
  const page = parseInt(params.get("page")) || 1;
  const keyword = params.get("keyword");
  const type = params.get("type");

  if (slug) {
    const detail = await getMovieDetail(slug);
    renderMovieDetail(detail);
    return;
  }

  let rawData;
  let title = "Phim mới cập nhật";

    if (keyword) {

    if (type && type !== "phim-moi-cap-nhat") {
        rawData = await getList(type, { page, keyword });
    } else {
        rawData = await searchMovies(keyword, { page });
    }

    } else {
    rawData = await getLatestMovies(page);
    }

  const { items, pagination } = normalizeData(rawData, page);

  renderMovies(items, title);
  renderPagination(pagination);
});

/* =========================================
   PAGE CHANGE
   ========================================= */

function goPage(page) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", page);
  window.location.search = params.toString();
}

/* =========================================
   SEARCH FORM HANDLER
========================================= */

document.getElementById("searchForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const keyword = document.getElementById("searchInput").value.trim();
  const category = document.getElementById("categorySelect").value;

  if (!keyword) return;

  const params = new URLSearchParams();

  params.set("keyword", keyword);

  // nếu chọn loại khác phim mới
  if (category !== "phim-moi-cap-nhat") {
    params.set("type", category);
  }

  window.location.search = params.toString();
});