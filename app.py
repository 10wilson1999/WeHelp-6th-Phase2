from sqlite3 import Cursor
from fastapi import FastAPI, Query, HTTPException, Depends, Request # type: ignore
from fastapi.responses import FileResponse # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # type: ignore
from fastapi.concurrency import run_in_threadpool # type: ignore
from mysql.connector import pooling # type: ignore
from datetime import datetime, timedelta
import mysql.connector # type: ignore
import bcrypt # type: ignore
import jwt # type: ignore
from pydantic import BaseModel # type: ignore
from typing import Optional, List
import time

app = FastAPI()  # type: ignore

# 提供靜態文件
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# 加入 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允許的來源
    allow_credentials=True,
    allow_methods=["*"],  # 允許所有 HTTP 方法
    allow_headers=["*"],  # 允許所有 Header
)

# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):  # type: ignore
    return FileResponse("./static/index.html", media_type="text/html")


@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):  # type: ignore
    return FileResponse("./static/attraction.html", media_type="text/html")


@app.get("/booking", include_in_schema=False)
async def booking(request: Request):  # type: ignore
    return FileResponse("./static/booking.html", media_type="text/html")


@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):  # type: ignore
    return FileResponse("./static/thankyou.html", media_type="text/html")

# 連接 MySQL
# 建立連線池（伺服器啟動時只做一次）
dbconfig = {
    "host": "localhost",
    "user": "root",
    "password": "10wilson1999",
    "database": "taipei_travel"
}
cnxpool = pooling.MySQLConnectionPool(pool_name="mypool", pool_size=20, **dbconfig)

# 連接 MySQL
# 取得連線
def get_db_connection():
    return cnxpool.get_connection()

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
        where_clause.append("(a.name LIKE %s OR a.mrt LIKE %s)")
        params.extend([f"%{keyword}%", keyword])

    if where_clause:
        sql += " WHERE " + " AND ".join(where_clause)
    
    sql += " GROUP BY a.id LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    try:
        cursor.execute(sql, params)
        results = cursor.fetchall()
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail={"error": True, "message": f"資料庫錯誤: {str(e)}"})

    finally:
        cursor.close()
        conn.close()

    # 處理圖片 URL 列表
    for result in results:
        result["images"] = result["images"].split(",") if result["images"] else []

    # 計算是否有下一頁
    next_page = page + 1 if len(results) == limit else None

    return {"nextPage": next_page, "data": results}

@app.get("/api/attraction/{attractionId}")
def get_attraction(attractionId: int):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, category, description, address, transport, mrt, lat, lng
            FROM attractions WHERE id = %s
        """, (attractionId,))
        attraction = cursor.fetchone()

        if not attraction:
            raise HTTPException(status_code=400, detail={"error": True, "message": "景點編號不正確"})

        cursor.execute("SELECT image_url FROM images WHERE attraction_id = %s", (attractionId,))
        images = [row["image_url"] for row in cursor.fetchall()]

        attraction["images"] = images

        return {"data": attraction}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail={"error": True, "message": f"伺服器內部錯誤: {str(e)}"})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.get("/api/mrts")
def get_mrt_list():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT mrt, COUNT(*) AS attraction_count
            FROM attractions
            WHERE mrt IS NOT NULL AND mrt != ''
            GROUP BY mrt
            ORDER BY attraction_count DESC
        """)
        
        mrt_list = [row[0] for row in cursor.fetchall()]

        return {"data": mrt_list}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail={"error": True, "message": f"伺服器內部錯誤: {str(e)}"})
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# JWT 設定
SECRET_KEY = "10wilson1999"
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer() # type: ignore

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload  # 回傳裡面的 user data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail={"error": True, "message": "Token 已過期"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail={"error": True, "message": "無效的 Token"})

# Booking資料模型
class BookingRequest(BaseModel):
    attractionId: int
    date: str
    time: str
    price: int

# 取得尚未確認預定下單的行程
@app.get("/api/booking")
async def get_booking(user_data: dict = Depends(verify_jwt)):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        user_id = user_data["id"]

        cursor.execute("""
            SELECT b.attraction_id, b.date, b.time, b.price, a.name, a.address
            FROM bookings b
            JOIN attractions a ON b.attraction_id = a.id
            WHERE b.user_id = %s
        """, (user_id,))
        booking = cursor.fetchone()

        if not booking:
            return {"data": None}

        # 取第一張景點圖片
        cursor.execute("SELECT image_url FROM images WHERE attraction_id = %s LIMIT 1", (booking["attraction_id"],))
        image = cursor.fetchone()
        image_url = image["image_url"] if image else None

        data = {
            "attraction": {
                "id": booking["attraction_id"],
                "name": booking["name"],
                "address": booking["address"],
                "image": image_url
            },
            "date": booking["date"],
            "time": booking["time"],
            "price": booking["price"]
        }

        return {"data": data}

    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail={"error": True, "message": f"伺服器錯誤: {str(e)}"})
    finally:
        cursor.close()
        conn.close()

# 建立新的預定行程
@app.post("/api/booking")
async def create_booking(booking: BookingRequest, user_data: dict = Depends(verify_jwt)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = user_data["id"]

        # 先刪除舊的預定行程（如果有）
        cursor.execute("DELETE FROM bookings WHERE user_id = %s", (user_id,))

        # 插入新的預定行程
        cursor.execute("""
            INSERT INTO bookings (user_id, attraction_id, date, time, price)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, booking.attractionId, booking.date, booking.time, booking.price))
        conn.commit()

        return {"ok": True}

    except mysql.connector.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail={"error": True, "message": f"伺服器錯誤: {str(e)}"})
    except Exception:
        raise HTTPException(status_code=400, detail={"error": True, "message": "資料輸入錯誤"})
    finally:
        cursor.close()
        conn.close()

# 刪除目前的預定行程
@app.delete("/api/booking")
async def delete_booking(user_data: dict = Depends(verify_jwt)):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = user_data["id"]

        cursor.execute("DELETE FROM bookings WHERE user_id = %s", (user_id,))
        conn.commit()

        return {"ok": True}

    except mysql.connector.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail={"error": True, "message": f"伺服器錯誤: {str(e)}"})
    finally:
        cursor.close()
        conn.close()

# 密碼雜湊（bcrypt）
async def hash_password(password: str) -> str:
    # 生成隨機鹽值
    salt = bcrypt.gensalt(rounds=4)
    # 使用 bcrypt 的加密方法來生成密碼哈希
    hashed_pw = await run_in_threadpool(bcrypt.hashpw, password.encode('utf-8'), salt)
    return hashed_pw

# 比對密碼
async def verify_password(plain_password: str, hashed_password: bytes) -> bool:
    # 使用 bcrypt 檢查密碼和哈希是否匹配
    return await run_in_threadpool(bcrypt.checkpw, plain_password.encode('utf-8'), hashed_password)

# 產生 JWT token
def create_token(data: dict) -> str:
    payload = {
        **data,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# 驗證 JWT token 並取得使用者資料
def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail={"error": True, "message": "Token已過期"})
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail={"error": True, "message": "無效的Token"})
    
# 輸入參數 Schema
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# 1️. 註冊新會員
@app.post("/api/user")
async def register_user(user: UserRegister):
    name = user.name
    email = user.email
    password = user.password

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail={
            "error": True,
            "message": "請填寫所有欄位"
        })

    hashed_pw = (await hash_password(password)).decode('utf-8')
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 檢查是否已存在 Email
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail={
                "error": True,
                "message": "註冊失敗，重複的Email或其他原因"
            })

        # 寫入新會員資料
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_pw)
        )
        conn.commit()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": True,
            "message": f"伺服器內部錯誤: {str(e)}"
        })
    finally:
        cursor.close()
        conn.close()

# 2️. 登入會員帳戶
@app.put("/api/user/auth")
async def login_user(login_data: UserLogin):
    email = login_data.email
    password = login_data.password

    if not email or not password:
        raise HTTPException(status_code=400, detail={
            "error": True,
            "message": "請填寫帳號與密碼"
        })

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id, name, email, password FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and await verify_password(password, user["password"]):
            token = create_token({"id": user["id"], "name": user["name"], "email": user["email"]})
            return {"ok": True, "token": token}
        else:
            raise HTTPException(status_code=400, detail={
                "error": True,
                "message": "帳號或密碼錯誤"
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": True,
            "message": f"伺服器錯誤: {str(e)}"
        })
    finally:
        cursor.close()
        conn.close()

# 3️. 取得當前登入的會員資訊
@app.get("/api/user/auth")
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user_data = decode_token(token)
        return {"data": {
            "id": user_data["id"],
            "name": user_data["name"],
            "email": user_data["email"]
        }}
    except Exception as e:
        return {"data": None}