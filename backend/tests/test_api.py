def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200;
    assert r.json() == {"status": "ok"}


def test_snapshot_describes_the_data(client):
    body = client.get("/api/snapshot").json()
    assert body["last_month"] == "2026-08"
    assert body["last_full_year"] == 2025
    assert body["fields"] == 142
    assert body["fields_without_outline"] == ["Sindre"]
    assert "Sodir" in body["attribution"]

def test_unknown_api_route_is_404(client):
    assert client.get("/api/nothing-here").status_code == 404