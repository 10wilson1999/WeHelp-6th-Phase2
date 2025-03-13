from fastapi import * # type: ignore
from fastapi.responses import FileResponse # type: ignore
from fastapi import FastAPI, Query, HTTPException # type: ignore
import mysql.connector # type: ignore
import os
app=FastAPI() # type: ignore

# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request): # type: ignore
	return FileResponse("./static/index.html", media_type="text/html")
@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int): # type: ignore
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request): # type: ignore
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request): # type: ignore
	return FileResponse("./static/thankyou.html", media_type="text/html")

# 從環境變數中讀取資料庫密碼
db_password = os.getenv('DB_PASSWORD')

if db_password is None:
    raise ValueError("Database password not set in environment variables")

# 連接 MySQL
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password=db_password,
        database="taipei_travel"
    )

@app.get("/api/attractions")
def get_attractions(
    page: int = Query(0, ge=0),
    keyword: str = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    limit = 12
    offset = page * limit

    # 構建 SQL 查詢
    sql = """
        SELECT a.*, GROUP_CONCAT(i.image_url) AS images 
        FROM attractions a
        LEFT JOIN images i ON a.id = i.attraction_id
    """
    
    # 關鍵字篩選條件
    where_clause = []
    params = []

    if keyword:
        where_clause.append("(a.name LIKE %s OR a.mrt = %s)")
        params.extend([f"%{keyword}%", keyword])

    if where_clause:
        sql += " WHERE " + " AND ".join(where_clause)
    
    sql += " GROUP BY a.id LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    cursor.execute(sql, params)
    results = cursor.fetchall()

    # 處理圖片 URL 列表
    for result in results:
        result["images"] = result["images"].split(",") if result["images"] else []

    # 計算是否有下一頁
    next_page = page + 1 if len(results) == limit else None

    conn.close()
    return {"nextPage": next_page, "data": results}

@app.get("/api/attraction/{attractionId}")
def get_attraction(attractionId: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 查詢景點資料
        cursor.execute("""
            SELECT id, name, category, description, address, transport, mrt, lat, lng
            FROM attractions WHERE id = %s
        """, (attractionId,))
        attraction = cursor.fetchone()

        if not attraction:
            raise HTTPException(status_code=400, detail={"error": True, "message": "景點編號不正確"})

        # 查詢圖片 URL
        cursor.execute("SELECT image_url FROM images WHERE attraction_id = %s", (attractionId,))
        images = [row["image_url"] for row in cursor.fetchall()]

        attraction["images"] = images

        conn.close()
        return {"data": attraction}

    except mysql.connector.Error:
        raise HTTPException(status_code=500, detail={"error": True, "message": "伺服器內部錯誤"})

@app.get("/api/mrts")
def get_mrt_list():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 查詢捷運站名稱，按照景點數量排序
        cursor.execute("""
            SELECT mrt, COUNT(*) AS attraction_count
            FROM attractions
            WHERE mrt IS NOT NULL AND mrt != ''
            GROUP BY mrt
            ORDER BY attraction_count DESC
        """)
        
        mrt_list = [row[0] for row in cursor.fetchall()]

        conn.close()
        return {"data": mrt_list}

    except mysql.connector.Error:
        raise HTTPException(status_code=500, detail={"error": True, "message": "伺服器內部錯誤"})