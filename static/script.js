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

        // 添加點擊事件，導向景點分頁
        spotDiv.addEventListener("click", () => {
            window.location.href = `http://52.62.175.53:8000/attraction/${spot.id}`;
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

// 抓取元素
const dialog = document.getElementById('dialog');
const loginForm = document.querySelector('.login-form');
const registerForm = document.querySelector('.register-form');
const loginButton = document.querySelector('#loginButton');
const registerButton = document.querySelector('#registerButton');
const closeDialog = document.getElementById('closeDialog');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const menuItem = document.querySelectorAll('.menu .item')[1]; // 登入/登出按鈕

// 開啟登入 Dialog
function openLoginDialog() {
    dialog.style.display = 'flex';
}

// 關閉 Dialog
closeDialog.addEventListener('click', () => {
    dialog.style.display = 'none';
    clearMessages();
});

// 清除訊息
function clearMessages() {
    loginMessage.textContent = '';
    registerMessage.textContent = '';
}

// 切換到註冊表單
document.getElementById('switchToRegister').addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    clearMessages();
});

// 切換到登入表單
document.getElementById('switchToLogin').addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'flex';
    clearMessages();
});

// 登入功能
loginButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        loginMessage.style.color = 'red';
        loginMessage.textContent = '請輸入電子郵件和密碼';
        return;
    }

    const response = await fetch('http://52.62.175.53:8000/api/user/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
        localStorage.setItem('token', result.token);
        dialog.style.display = 'none';
        updateUIAfterLogin();
    } else {
        loginMessage.style.color = 'red';
        loginMessage.textContent = result.message || '登入失敗';
    }
});

// 註冊功能
registerButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (!name || !email || !password) {
        registerMessage.style.color = 'red';
        registerMessage.textContent = '請填寫所有欄位';
        return;
    }

    const response = await fetch('http://52.62.175.53:8000/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
        registerMessage.style.color = 'green';
        registerMessage.textContent = '註冊成功，請登入系統';
    } else {
        registerMessage.style.color = 'red';
        registerMessage.textContent = result.message || '註冊失敗';
    }
});

// 取得目前使用者資訊
async function getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await fetch('http://52.62.175.53:8000/api/user/auth', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        const result = await response.json();
        return result.data;
    } else {
        localStorage.removeItem('token');
        return null;
    }
}

// 更新畫面 (登入後)
async function updateUIAfterLogin() {
    const user = await getCurrentUser();

    if (user) {
        menuItem.textContent = `登出系統`;
        menuItem.removeEventListener('click', openLoginDialog);
        menuItem.addEventListener('click', logout);
    } else {
        updateUIAfterLogout();
    }
}

// 登出功能
function logout() {
    localStorage.removeItem('token');
    updateUIAfterLogout();
}

// 更新畫面 (登出後)
function updateUIAfterLogout() {
    menuItem.textContent = '登入/註冊';
    menuItem.removeEventListener('click', logout);
    menuItem.addEventListener('click', openLoginDialog);
}

// 頁面載入時，自動檢查登入狀態
window.addEventListener('load', async () => {
    await updateUIAfterLogin();
});

// 預設先掛 openLoginDialog
menuItem.addEventListener('click', openLoginDialog);

// Booking 選取「預定行程」按鈕
const bookingButton = document.querySelectorAll('.menu .item')[0];

// Booking 點擊事件處理函式 先檢查登入狀態，再執行對應的動作
bookingButton.addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        // 尚未登入
        openLoginDialog();
        return;
    }

    try {
        const response = await fetch('http://52.62.175.53:8000/api/user/auth', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok && result.data) {
            // 使用者已登入，導向 booking 頁面
            window.location.href = 'http://52.62.175.53:8000/booking';
        } else {
            // token 無效或登入過期，清除並顯示登入畫面
            localStorage.removeItem('token');
            openLoginDialog();
        }
    } catch (error) {
        console.error('檢查登入狀態時發生錯誤', error);
        openLoginDialog();
    }
});