// 返回首頁
document.addEventListener("DOMContentLoaded", function () {
    // 選取 .title 元素
    const titleElement = document.querySelector(".title");

    // 監聽點擊事件，導向首頁
    titleElement.addEventListener("click", function () {
        window.location.href = "http://52.62.175.53:8000/";
    });
});

// 渲染資料
document.addEventListener("DOMContentLoaded", async function () {
    // 取得 URL 參數 id
    const pathSegments = window.location.pathname.split("/");
    const idNumber = pathSegments[pathSegments.length - 1]; // 取得最後的數字部分

    if (!idNumber) {
        console.error("缺少 id 參數");
        return;
    }

    // API URL
    const apiUrl = `http://52.62.175.53:8000/api/attraction/${idNumber}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data || !data.data) {
            console.error("API 回應格式錯誤", data);
            return;
        }

        const attraction = data.data;

        // 圖片
        const picturesContainer = document.querySelector(".main img");
        const pictureSelectContainer = document.querySelector(".picture-select");
        let currentImageIndex = 0;

        if (attraction.images && attraction.images.length > 0) {
            picturesContainer.src = attraction.images[0];
            pictureSelectContainer.innerHTML = "";

            // 建立一個新的 container 來放 radio 按鈕
            const radioContainer = document.createElement("div");
            radioContainer.classList.add("picture-select");
            pictureSelectContainer.innerHTML = ""; // 清空舊的內容
            pictureSelectContainer.appendChild(radioContainer);

            attraction.images.forEach((image, index) => {
                const label = document.createElement("label");
                label.classList.add("picture-select-item");

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "picture-select";
                radio.checked = index === 0;
                radio.addEventListener("change", () => {
                    picturesContainer.src = attraction.images[index];
                });

                label.appendChild(radio);
                radioContainer.appendChild(label);
            });
        }

        // 左右按鈕事件
        document.querySelector(".left").addEventListener("click", () => {
            if (attraction.images.length > 0) {
                currentImageIndex = (currentImageIndex - 1 + attraction.images.length) % attraction.images.length;
                updateImageAndDots();
            }
        });
        
        document.querySelector(".right").addEventListener("click", () => {
            if (attraction.images.length > 0) {
                currentImageIndex = (currentImageIndex + 1) % attraction.images.length;
                updateImageAndDots();
            }
        });
        
        // 更新圖片與對應圓圈
        function updateImageAndDots() {
            picturesContainer.src = attraction.images[currentImageIndex];
        
            // 取得所有的 radio 按鈕
            const dots = document.querySelectorAll(".picture-select input");
            dots.forEach((dot, index) => {
                dot.checked = index === currentImageIndex;
            });
        }      

        // 名稱
        document.querySelector(".profile-name").textContent = attraction.name;

        // 類別與捷運站
        document.querySelector(".type").textContent = attraction.category;
        document.querySelector(".station").textContent = attraction.mrt;

        // 描述
        document.querySelector(".description .content").textContent = attraction.description;

        // 地址
        document.querySelector(".address .content").textContent = attraction.address;

        // 交通
        document.querySelector(".transport .content").textContent = attraction.transport;

        // **動態更新價格**
        const priceElement = document.querySelector(".price");
        const morningOption = document.querySelector("input[value='morning']");
        const afternoonOption = document.querySelector("input[value='afternoon']");

        function updatePrice() {
            if (morningOption.checked) {
                priceElement.textContent = "新台幣 2000 元";
            } else if (afternoonOption.checked) {
                priceElement.textContent = "新台幣 2500 元";
            }
        }

        morningOption.addEventListener("change", updatePrice);
        afternoonOption.addEventListener("change", updatePrice);

    } catch (error) {
        console.error("抓取 API 資料時發生錯誤:", error);
    }
});

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
