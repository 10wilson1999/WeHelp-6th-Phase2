// 返回首頁
document.addEventListener("DOMContentLoaded", function () {
    // 選取 .title 元素
    const titleElement = document.querySelector(".title");

    // 監聽點擊事件，導向首頁
    titleElement.addEventListener("click", function () {
        window.location.href = "http://52.62.175.53:8000/";
    });
});

// Booking infor
async function fetchBookingInfo() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "http://52.62.175.53:8000/";
        return;
    }

    try {
        const [user, bookingRes] = await Promise.all([
            getCurrentUser(),
            fetch("http://52.62.175.53:8000/api/booking", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        ]);

        if (!user) {
            alert("請先登入");
            window.location.href = "http://52.62.175.53:8000/";
            return;
        }

        const bookingResult = await bookingRes.json();
        const booking = bookingResult.data;

        if (!booking) {
            document.querySelector(".headline").innerHTML = `<span>您好，</span><span>${user.name}</span><span>，目前沒有預定的行程。</span>`;
            document.querySelector(".section").style.display = "none";
            document.querySelector(".confirm").style.display = "none";
            return;
        }

        // 更新頁面內容
        document.querySelector(".headline span:nth-child(2)").textContent = user.name;
        document.querySelector(".infor .title span:nth-child(2)").textContent = booking.attraction.name;
        document.querySelector(".infor .detail:nth-child(2) .content").textContent = booking.date;
        document.querySelector(".infor .detail:nth-child(3) .content").textContent = 
            booking.time === "morning" ? "早上 9 點到下午 4 點" : "下午 2 點到晚上 9 點";
        document.querySelector(".infor .detail:nth-child(4) .content").textContent = `新台幣 ${booking.price} 元`;
        document.querySelector(".infor .detail:nth-child(5) .content").textContent = booking.attraction.address;
        document.querySelector(".picture img").src = booking.attraction.image;

        document.querySelector(".confirm-price").textContent = `總價：新台幣 ${booking.price} 元`;

        const deleteBtn = document.querySelector(".delete img");
        deleteBtn.addEventListener("click", async () => {
            const response = await fetch("http://52.62.175.53:8000/api/booking", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await response.json();
            if (response.ok && result.ok) {
                window.location.reload();
            } else {
                alert("刪除預訂失敗，請稍後再試。");
            }
        });

    } catch (error) {
        console.error("取得預定資料失敗:", error);
        alert("無法載入預定資料，請稍後再試。");
    }
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