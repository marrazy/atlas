import pytest
from fastapi.testclient import TestClient

from api.app import create_app, is_frontend_route

INDEX = "<!doctype html><title>atlas</title>"


@pytest.fixture
def site(tmp_path) -> TestClient:
    """The app serving a small built frontend, like the one the Dockerfile copies to /app/static."""
    (tmp_path / "index.html").write_text(INDEX)
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('atlas')")
    return TestClient(create_app(tmp_path))


def test_home_page_is_index(site):
    r = site.get("/")
    assert r.status_code == 200
    assert r.text == INDEX


@pytest.mark.parametrize("path", ["/lifecycles", "/lifecycles/", "/fields", "/fields/3420717", "/wells"])
def test_app_routes_get_index_so_refresh_works(site, path):
    # the React app decides what to show, including its own "Page not found"
    r = site.get(path)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/html")
    assert r.text == INDEX


def test_real_files_are_served_as_themselves(site):
    r = site.get("/assets/app.js")
    assert r.status_code == 200
    assert r.text == "console.log('atlas')"


@pytest.mark.parametrize("path", ["/assets/old.js", "/favicon.ico", "/robots.txt"])
def test_missing_files_are_still_404(site, path):
    # a browser asking for a script must never get the HTML page instead
    assert site.get(path).status_code == 404


@pytest.mark.parametrize("path", ["/api", "/api/nothing-here", "/api/fields/1/wells"])
def test_unknown_api_routes_are_still_json_404(site, path):
    r = site.get(path)
    assert r.status_code == 404
    assert r.json() == {"detail": "Not Found"}


def test_api_still_works_next_to_the_frontend(site):
    assert site.get("/api/health").json() == {"status": "ok"}
    assert site.get("/api/snapshot").json()["last_month"] == "2026-08"


def test_api_errors_are_not_replaced_by_the_page(site):
    r = site.get("/api/fields/1")
    assert r.status_code == 404
    assert r.json() == {"detail": "no field with id 1"}


def test_only_get_and_head_reach_the_page(site):
    assert site.head("/lifecycles").status_code == 200
    assert site.post("/lifecycles").status_code == 405


def test_no_frontend_folder_means_api_only(tmp_path):
    client = TestClient(create_app(tmp_path / "missing"))
    assert client.get("/").status_code == 404
    assert client.get("/api/health").status_code == 200


@pytest.mark.parametrize("path, expected", [
    ("lifecycles", True),
    ("fields/3420717", True),
    ("lifecycles/", True),
    ("api", False),
    ("api/fields", False),
    ("apiary", True),
    ("assets/index-B8QPYy5X.js", False),
    ("favicon.svg", False),
])
def test_is_frontend_route(path, expected):
    assert is_frontend_route(path) is expected
