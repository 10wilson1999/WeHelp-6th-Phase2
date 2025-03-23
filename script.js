let nextPage = 0; // 確保從 page=0 開始
let isFetching = false; // 防止重複請求
let lastObservedElement = null; // 記錄最後觀察的元素，避免重複觀察
let searchKeyword = ""; // 用來存儲當前的搜尋關鍵字

// 取得適合當前裝置的 .spots 容器
function getTargetContainer() {
    const width = window.innerWidth;
    if (width < 600) return ".spots0";
    if (width < 1200) return ".spots1";
    return ".spots2";
}

// IntersectionObserver 監測滾動
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting && nextPage !== null && !isFetching) {
            const url = `http://54.66.95.186:8000/api/attractions?page=${nextPage}&keyword=${encodeURIComponent(searchKeyword)}`;
            fetchAttractions(url);
        }
    });
}, { root: null, threshold: 1 });

// **統一 API 請求函數**
function fetchAttractions(url) {
    if (isFetching) return;
    isFetching = true;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.data) {
                const targetContainer = getTargetContainer();
                renderSpots(data.data, targetContainer);

                // 確保 API 回應的 nextPage 不為 undefined
                nextPage = data.nextPage !== undefined ? data.nextPage : null;
            } else {
                nextPage = null;
            }
            console.log("API 回傳資料:", data); // 確認回傳是否包含符合關鍵字的資料
        })
        .catch(error => console.error("API 請求錯誤：", error))
        .finally(() => isFetching = false);
}

// **初次載入**
fetchAttractions(`http://54.66.95.186:8000/api/attractions?page=${nextPage}`);

// **監聽視窗大小變化，只重新渲染適當容器**
window.addEventListener("resize", () => {
    const newContainer = getTargetContainer();
    
    // **避免清空已經載入的資料，只搬移內容**
    document.querySelectorAll(".spots0, .spots1, .spots2").forEach(el => {
        if (el.classList.contains(newContainer.substring(1))) return; // 目標容器不清空
        el.innerHTML = ""; // 只清空不適用的容器
        observer.disconnect(); // 移除所有觀察的元素
    });

    // 重新載入當前頁面數據到新容器
    fetchAttractions(`http://54.66.95.186:8000/api/attractions?page=0`);

    observer.disconnect(); // 先清除監測
    // 等待新容器渲染後啟動滾動加載
    setTimeout(() => {
        const spotsContainer = document.querySelector(newContainer);
        const allSpotElements = spotsContainer.querySelectorAll(".ds, .ps, .ms");
        const newLastElement = allSpotElements[allSpotElements.length - 1];

        const targetContainer = getTargetContainer(); // 確保 targetContainer 已經取得

        if (newLastElement && newLastElement !== lastObservedElement) {
            observer.observe(newLastElement);
            lastObservedElement = newLastElement;
        }
    }, 100);
});

// 監聽搜尋表單提交
const searchForms = document.querySelectorAll("form");
searchForms.forEach(form => {
    form.addEventListener("submit", function(event) {
        event.preventDefault(); // 防止刷新頁面
        const keyword = form.querySelector("input").value.trim();
        handleSearch(keyword);
    });
});

// 搜尋景點 API，更新 .spots 容器
function handleSearch(keyword) {
    searchKeyword = keyword; // 存儲關鍵字
    nextPage = 0; // 重置下一頁為 0
    isFetching = false;
    observer.disconnect();

    document.querySelectorAll(".spots0, .spots1, .spots2").forEach(el => {
        el.innerHTML = "";
    });

    const url = `http://54.66.95.186:8000/api/attractions?page=0&keyword=${encodeURIComponent(keyword)}`;

    fetchAttractions(url);
}

// For RWD
const mobile = document.getElementById("mobile");
const panel = document.getElementById("panel");
const desktop = document.getElementById("desktop");

function updateLayout() {
    const width = window.innerWidth;

    if (width <= 599) {
    // Mobile
    document.getElementById("mobile").style.display = "block";
    document.getElementById("panel").style.display = "none";
    document.getElementById("desktop").style.display = "none";
    } else if (width >= 600 && width <= 1199) {
    // Panel
    document.getElementById("mobile").style.display = "none";
    document.getElementById("panel").style.display = "block";
    document.getElementById("desktop").style.display = "none";
    } else {
    // Desktop
    document.getElementById("mobile").style.display = "none";
    document.getElementById("panel").style.display = "none";
    document.getElementById("desktop").style.display = "block";
    }
}

window.addEventListener("load", updateLayout);
window.addEventListener("resize", updateLayout);

// **renderSpots 更新：**
function renderSpots(spots, divName) {
    const contentDiv = document.querySelector(divName);

    if (!contentDiv) {
        console.error("Error: Cannot find container", divName);
        return;
    }

    const spotCount = Math.min(spots.length, 13); // 確保不會超過資料的長度

    // **根據 RWD 版本選擇 class**
    let itemClass = "ds"; // 預設為 desktop 版
    if (divName === ".spots1") itemClass = "ps"; // panel 版
    if (divName === ".spots0") itemClass = "ms"; // mobile 版

    for (let i = 0; i < spotCount; i++) {
        let spot;
        if (itemClass === "ms") {
            spot = createMobileSpot(spots[i], `ms${i}`);
        } else if (itemClass === "ps") {
            spot = createPanelSpot(spots[i], `ps${i}`);
        } else {
            spot = createDesktopSpot(spots[i], `ds${i}`);
        }
        contentDiv.appendChild(spot); // 追加新內容，而不是覆蓋

        // **新增觀察，確保無限加載**
        observer.observe(spot);
    }
}

// 捷運站滾動功能與資料載入
function scrollMRT(mrtDiv, offset) {
    const container = mrtDiv.querySelector(".mrt-container");
    if (container) {
        container.scrollBy({ left: offset, behavior: "smooth" });
    }
}

async function fetchMRTStations() {
    try {
        const response = await fetch("http://54.66.95.186:8000/api/mrts");
        const data = await response.json();
        if (data && data.data) {
            updateMRTList(data.data);
        }
    } catch (error) {
        console.error("無法獲取捷運站資料：", error);
    }
}

function updateMRTList(stations) {
    document.querySelectorAll(".mrt").forEach(mrtDiv => {
        const container = mrtDiv.querySelector(".mrt-container");
        if (!container) return;

        container.innerHTML = ""; // 清空舊資料

        stations.forEach(station => {
            const stationItem = document.createElement("div");
            stationItem.className = "item";
            stationItem.textContent = station;
            container.appendChild(stationItem);
        });

        // 綁定左右按鈕事件
        mrtDiv.querySelector(".left").onclick = () => scrollMRT(mrtDiv, -200);
        mrtDiv.querySelector(".right").onclick = () => scrollMRT(mrtDiv, 200);
    });
}

// 初始化
fetchMRTStations();

// 捷運站點擊事件
function setupMRTClickEvents() {
    document.querySelectorAll(".mrt-container .item").forEach(stationItem => {
        stationItem.addEventListener("click", () => {
            const mrtName = stationItem.textContent.trim();
            document.querySelectorAll("input[type='text']").forEach(input => {
                input.value = mrtName; // 更新搜尋框內的關鍵字
            });
            searchByMRT(mrtName);
        });
    });
}

// 根據捷運站名稱搜尋景點
function searchByMRT(mrtName) {
    searchKeyword = mrtName; // 更新搜尋關鍵字
    nextPage = 0; // 重置頁碼
    isFetching = false;
    observer.disconnect(); // 取消滾動監測

    // 清空所有 .spots 容器
    document.querySelectorAll(".spots0, .spots1, .spots2").forEach(el => {
        el.innerHTML = "";
    });

    // 重新發送 API 請求，改用 `keyword` 參數來確保搜尋準確性
    const url = `http://54.66.95.186:8000/api/attractions?page=0&keyword=${encodeURIComponent(mrtName)}`;
    fetchAttractions(url);
}

// 確保捷運站資料載入後，綁定點擊事件
fetchMRTStations().then(() => {
    setupMRTClickEvents();
});

// MobileSpot
function createMobileSpot(spot, Name) {
    const box = document.createElement("div");
    box.className = Name;
    box.style.position = "relative";

    // 處理圖片
    const img = document.createElement("img");
    if (spot.images && spot.images.length > 0) {
        img.src = spot.images[0]; // 確認有圖片後再存取
    } else {
        img.src = "picture/default.png"; // 若沒有圖片就顯示預設圖片
    }
    img.alt = "Cinque Terre";
    img.style.width = "100%";
    img.style.height = "197px";
    img.style.objectFit = "cover";

    //處理名稱
    const name = document.createElement("div");
    name.textContent = spot.name;
    name.style.width = "100%";
    name.style.height = "40px";
    name.style.position = "absolute";
    name.style.bottom = "45px";
    name.style.color = "white";
    name.style.fontSize = "16px";
    name.style.fontWeight = "bold";
    name.style.textAlign = "left";
    name.style.padding = "0 10px";
    name.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    name.style.display = "flex";
    name.style.alignItems = "center";
    name.style.overflow = 'hidden';// 隱藏超出範圍的文字
    name.style.whiteSpace = 'nowrap';// 禁止文字換行
    name.style.textOverflow = 'ellipsis';// 超出範圍時顯示 "..."

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
    box.appendChild(img);
    box.appendChild(name);
    box.appendChild(detail);

    return box;
}

// PanelSpot
function createPanelSpot(spot, Name) {
    const box = document.createElement("div");
    box.className = Name;
    box.style.position = "relative";

    // 處理圖片
    const img = document.createElement("img");
    img.src = spot.images[0]; // 取得第一張圖片的 URL
    img.alt = "Cinque Terre";
    img.style.width = "100%";
    img.style.height = "197px";
    img.style.objectFit = "cover";

    //處理名稱
    const name = document.createElement("div");
    name.textContent = spot.name;
    name.style.width = "100%";
    name.style.height = "40px";
    name.style.position = "absolute";
    name.style.bottom = "45px";
    name.style.color = "white";
    name.style.fontSize = "16px";
    name.style.fontWeight = "bold";
    name.style.textAlign = "left";
    name.style.padding = "0 10px";
    name.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    name.style.display = "flex";
    name.style.alignItems = "center";
    name.style.overflow = 'hidden';// 隱藏超出範圍的文字
    name.style.whiteSpace = 'nowrap';// 禁止文字換行
    name.style.textOverflow = 'ellipsis';// 超出範圍時顯示 "..."

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
    box.appendChild(img);
    box.appendChild(name);
    box.appendChild(detail);

    return box;
}

// DesktopSpot
function createDesktopSpot(spot, Name) {
    const box = document.createElement("div");
    box.classList.add("ds", Name); // 確保包含 .ds
    box.style.position = "relative";

    // 處理圖片
    const img = document.createElement("img");
    img.src = spot.images[0]; // 取得第一張圖片的 URL
    img.alt = "Cinque Terre";
    img.style.width = "270px";
    img.style.height = "197px";
    img.style.objectFit = "cover";

    //處理名稱
    const name = document.createElement("div");
    name.textContent = spot.name;
    name.style.width = "250px";
    name.style.height = "40px";
    name.style.position = "absolute";
    name.style.bottom = "45px";
    name.style.color = "white";
    name.style.fontSize = "16px";
    name.style.fontWeight = "bold";
    name.style.textAlign = "left";
    name.style.padding = "0 10px";
    name.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    name.style.display = "flex";
    name.style.alignItems = "center";
    name.style.overflow = 'hidden';// 隱藏超出範圍的文字
    name.style.whiteSpace = 'nowrap';// 禁止文字換行
    name.style.textOverflow = 'ellipsis';// 超出範圍時顯示 "..."

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
    box.appendChild(img);
    box.appendChild(name);
    box.appendChild(detail);

    return box;
}
