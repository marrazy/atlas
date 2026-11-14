import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="atlas_api")

@app.get("/api/health")
async def health()->dict[str, bool]:
    return {"ok": True}

# Mounted last so /api routes take precedence
if static_dir := os.environ.get("STATIC_DIR"):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
