let currentPage = 1;
let currentCategory = "phim-moi-cap-nhat";
let currentKeyword = "";

function loadMovies(page = 1) {
  currentPage = page;

  let url = `/movies?page=${page}&pass=123456`;

  if (currentKeyword) {
    url += `&keyword=${currentKeyword}`;
  } else {
    url += `&category=${currentCategory}`;
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("FULL DATA:", data);

      let movies = [];

      if (data.items) {
        movies = data.items;
      } else if (data.data && data.data.items) {
        movies = data.data.items;
      }
      console.log("MOVIES:", movies);

      if (!movies || movies.length === 0) {
        document.getElementById("movieList").innerHTML = "Không có dữ liệu";
        return;
      }

      renderMovies(movies);

      let totalPages = 1;

      if (data.pagination && data.pagination.totalPages) {
        totalPages = data.pagination.totalPages;
      }

      renderPagination(totalPages);
    })
    .catch(err => {
      console.error("Fetch lỗi:", err);
      console.log(data);
    });
}


 const movieList = document.getElementById("movie-list");

function renderMovies(movies) {
  movieList.innerHTML = "";

  movies.forEach(movie => {
    // Ảnh ưu tiên thumb_url → poster_url → fallback
    const imageUrl =
      movie.thumb_url ||
      movie.poster_url ||
      "https://dummyimage.com/300x450/cccccc/000000.jpg&text=No+Image";

    const movieItem = document.createElement("div");
    movieItem.className = "movie-item";

    movieItem.innerHTML = `
      <div class="movie-card">
        <img 
          src="${imageUrl}" 
          alt="${movie.name}"
          loading="lazy"
          onerror="this.src='https://dummyimage.com/300x450/cccccc/000000.jpg&text=No+Image'"
        />
        <h3>${movie.name}</h3>
        <p>${movie.year || ""}</p>
      </div>
    `;

    movieList.appendChild(movieItem);
  });
}

async function fetchMovies(page = 1) {
  try {
    const res = await fetch(`YOUR_API_URL?page=${page}`);
    const data = await res.json();

    console.log("FULL DATA:", data);

    if (data.status && data.items) {
      renderMovies(data.items);
    }
  } catch (err) {
    console.error("Fetch lỗi:", err);
  }
}

function renderPagination(totalPages) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const maxButtons = 5; // số nút hiển thị
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);

  if (end - start < maxButtons - 1) {
    start = Math.max(1, end - maxButtons + 1);
  }

  // Nút Prev
  if (currentPage > 1) {
    pagination.innerHTML += `
      <button onclick="loadMovies(${currentPage - 1})">«</button>
    `;
  }

  // Các số trang
  for (let i = start; i <= end; i++) {
    pagination.innerHTML += `
      <button onclick="loadMovies(${i})"
        style="${i === currentPage ? 'background:red;color:white;' : ''}">
        ${i}
      </button>
    `;
  }

  // Nút Next
  if (currentPage < totalPages) {
    pagination.innerHTML += `
      <button onclick="loadMovies(${currentPage + 1})">»</button>
    `;
  }
}

async function searchMovies(keyword) {
  try {
    const res = await fetch(`YOUR_SEARCH_API?keyword=${keyword}`);
    const data = await res.json();

    if (data.status && data.items) {
      renderMovies(data.items);
    }
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("categorySelect").addEventListener("change", function () {
  currentCategory = this.value;
  currentKeyword = "";
  loadMovies(1);
});

loadMovies();