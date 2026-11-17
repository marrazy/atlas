import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware


from .routes import router

app = FastAPI(title="Atlas API",
              description="Production data from the Norwegian Continental Shelf",
              version="1.0.0"
              )

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.get("/api/health", include_in_schema=False)
async def health()->dict:
    return {"status": "ok"}

app.include_router(router)


static_dir = Path(os.getenv("STATIC_DIR", "static"))

if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
