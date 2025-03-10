from fastapi import * # type: ignore
from fastapi.responses import FileResponse # type: ignore
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