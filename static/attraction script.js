document.addEventListener("DOMContentLoaded", async function () {
    // 取得 URL 參數 id
    const urlParams = new URLSearchParams(window.location.search);
    const idNumber = urlParams.get("id");

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
