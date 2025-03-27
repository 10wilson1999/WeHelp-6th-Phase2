let nextPage = 0; // 確保從 page=0 開始
let isFetching = false; // 防止重複請求
let searchKeyword = ""; // 用來存儲當前的搜尋關鍵字

// API 請求函數
function fetchAttractions(url) {
    if (isFetching) return;
    isFetching = true;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                renderSpots(data.data);
                nextPage = data.nextPage !== undefined ? data.nextPage : null;
            } else {
                nextPage = null;
            }
        })
        .catch(error => console.error("API 請求錯誤：", error))
        .finally(() => {
            isFetching = false;
            observeLastElement();
        });
}

// IntersectionObserver
const observer = new IntersectionObserver(handleIntersect, { root: null, threshold: 1 });

// 監測滾動
function handleIntersect(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting && nextPage !== null && !isFetching) {
            const url = `http://52.62.175.53:8000/api/attractions?page=${nextPage}&keyword=${encodeURIComponent(searchKeyword)}`;
            fetchAttractions(url);
        }
    });
}

// 監測清單中最後一個 .spot
function observeLastElement() {
    observer.disconnect();
    const spots = document.querySelectorAll(".spot");
    if (spots.length > 0) {
        const lastSpot = spots[spots.length - 1];
        observer.observe(lastSpot);
    }
    if (nextPage === null) {
        observer.disconnect();
    }
}

// 初次載入
fetchAttractions(`http://52.62.175.53:8000/api/attractions?page=${nextPage}`);

// 捷運 API 請求
fetch(`http://52.62.175.53:8000/api/mrts`)
    .then(response => response.json())
    .then(data => {
        if (data && data.data) {
            updateMRTList(data.data);
        }
    })
    .catch(error => console.error("無法獲取捷運站資料：", error));

// MRT 捲動
function scrollMRT(offset) {
    document.querySelector(".mrt-container").scrollBy({ left: offset, behavior: "smooth" });
}

document.querySelector(".left").addEventListener("click", () => scrollMRT(-200));
document.querySelector(".right").addEventListener("click", () => scrollMRT(200));

// 更新捷運列表
function updateMRTList(stations) {
    const container = document.querySelector(".mrt-container");
    container.innerHTML = "";
    stations.forEach(station => {
        const stationItem = document.createElement("div");
        stationItem.className = "item";
        stationItem.textContent = station;
        container.appendChild(stationItem);
    });
}

// MRT 點擊事件
document.querySelector(".mrt-container").addEventListener("click", event => {
    if (event.target.classList.contains("item")) {
        const mrtName = event.target.textContent.trim();
        document.querySelector("input[type='text']").value = mrtName;
        searchByMRT(mrtName);
    }
});


// 根據捷運站名稱搜尋
function searchByMRT(mrtName) {
    if (isFetching) return;
    searchKeyword = mrtName;
    nextPage = 0;
    isFetching = false;

    document.querySelector(".spots").innerHTML = "";
    fetchAttractions(`http://52.62.175.53:8000/api/attractions?page=0&keyword=${encodeURIComponent(mrtName)}`);
}

// 搜尋功能
document.querySelector("form").addEventListener("submit", function(event) {
    event.preventDefault();
    const keyword = document.querySelector("input").value.trim();
    searchByMRT(keyword);
});

// 渲染景點
function renderSpots(spots) {
    const contentDiv = document.querySelector(".spots");
    spots.forEach(spot => {
        const spotDiv = document.createElement("div");
        spotDiv.className = "spot";

        // 添加點擊事件，導向 attraction.html
        spotDiv.addEventListener("click", () => {
            window.location.href = `attraction.html?id=${spot.id}`;
        });

        // 處理圖片
        const img = document.createElement("img");
        img.src = spot.images[0];
        img.alt = spot.name;

        //處理名稱
        const name = document.createElement("div");
        name.className = "spot-name";
        name.textContent = spot.name;

        // 處理細節 (包含捷運站與類別)
        const detail = document.createElement("div");
        detail.className = "detail";

        // 處理捷運站
        const mrt = document.createElement("div");
        mrt.className = "station";
        mrt.textContent = spot.mrt;

        // 處理類別
        const cat = document.createElement("div");
        cat.className = "type";
        cat.textContent = spot.category;

        // 將捷運站與類別加入細節容器
        detail.appendChild(mrt);
        detail.appendChild(cat);
        // 將圖片、名稱、類別和捷運加入到盒子中
        spotDiv.appendChild(img);
        spotDiv.appendChild(name);
        spotDiv.appendChild(detail);
        contentDiv.appendChild(spotDiv);
    });
    observeLastElement();
}
