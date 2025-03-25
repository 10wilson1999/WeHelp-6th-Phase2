import json
import mysql.connector # type: ignore

# 連接 MySQL
conn = mysql.connector.connect(
    host="172.31.3.103",
    user="root",
    password="10wilson1999",
    database="taipei_travel"
)
cursor = conn.cursor()

# 讀取 JSON 文件
with open("data/taipei-attractions.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# 解析 JSON 並插入資料庫
for item in data["result"]["results"]:
    id = item["_id"]
    name = item["name"]
    category = item["CAT"]
    description = item["description"]
    address = item["address"]
    transport = item["direction"]
    mrt = item.get("MRT", None)
    lat = float(item["latitude"])
    lng = float(item["longitude"])

    # 插入 attractions 表
    cursor.execute("""
        INSERT INTO attractions (id, name, category, description, address, transport, mrt, lat, lng)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
        name=VALUES(name), category=VALUES(category), description=VALUES(description),
        address=VALUES(address), transport=VALUES(transport), mrt=VALUES(mrt),
        lat=VALUES(lat), lng=VALUES(lng)
    """, (id, name, category, description, address, transport, mrt, lat, lng))

    # 處理圖片
    images = item["file"].split("https://")[1:]  # 分割圖片 URL
    for img in images:
        image_url = "https://" + img.strip()
    
        # 處理圖片並過濾非 JPG/PNG 格式的 URL
        valid_extensions = (".jpg", ".png", ".JPG", ".PNG")

        # 檢查 URL 是否符合圖片格式
        if image_url.lower().endswith(valid_extensions):
            cursor.execute("""
                INSERT INTO images (attraction_id, image_url)
                VALUES (%s, %s)
            """, (id, image_url))

# 提交更改
conn.commit()

# 關閉連接
cursor.close()
conn.close()