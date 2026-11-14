def main() -> None:
    import uvicorn

    uvicorn.run("api.app:app", port=8000, reload=True)
