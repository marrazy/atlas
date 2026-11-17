import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.types import Scope


from .routes import router


def is_frontend_route(path: str) -> bool:
    """True for paths the React app handles itself, like "lifecycles" or "fields/3420717".

    API paths and paths that look like files ("assets/old.js") are not, so they still get a real 404.
    """
    first, _, _ = path.partition("/")
    last = path.rstrip("/").rsplit("/", 1)[-1]
    return first != "api" and "." not in last


class FrontendFiles(StaticFiles):
    """Serves the built frontend, and index.html for the app's own routes so they work when opened directly."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404 or not is_frontend_route(path):
                raise
            return await super().get_response("index.html", scope)


def create_app(static_dir: Path) -> FastAPI:
    app = FastAPI(title="Atlas API",
                  description="Production data from the Norwegian Continental Shelf",
                  version="1.0.0"
                  )

    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.get("/api/health", include_in_schema=False)
    async def health()->dict:
        return {"status": "ok"}

    app.include_router(router)

    if static_dir.is_dir():
        app.mount("/", FrontendFiles(directory=static_dir, html=True), name="frontend")

    return app


app = create_app(Path(os.getenv("STATIC_DIR", "static")))
