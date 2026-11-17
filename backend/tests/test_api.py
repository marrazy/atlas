from conftest import VOLVE


# API /snapshot
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

# API /fields

def test_fields_lists_every_field(client):
    body = client.get("/api/fields").json()
    assert len(body) == 142
    assert len({f["field_id"] for f in body}) == 142  # no duplicates


def test_fields_are_largest_first(client):
    body = client.get("/api/fields").json()
    totals = [f["cum_oe_net_msm3"] for f in body]
    assert totals == sorted(totals, reverse=True)
    assert body[0]["name"] == "Troll"


def test_fields_volve_entry(client):
    body = client.get("/api/fields").json()
    volve = next(f for f in body if f["field_id"] == VOLVE)
    assert volve["name"] == "Volve"
    assert volve["status"] == "Shut down"
    assert volve["main_product"] == "oil"
    assert volve["operator"] == "Equinor"
    assert volve["first_production_year"] == 2008
    assert volve["last_production_year"] == 2016
    assert volve["producing_years"] == list(range(2008, 2017))


def test_fields_without_outline_have_no_location(client):
    body = client.get("/api/fields").json()
    sindre = next(f for f in body if f["name"] == "Sindre")
    assert sindre["lon"] is None and sindre["lat"] is None


def test_fields_first_year_matches_producing_years(client):
    # fields with no production of their own (not started yet, or reported
    # under a bigger field they are tied into) have no first year and no years
    body = client.get("/api/fields").json()
    for f in body:
        if f["producing_years"]:
            assert f["first_production_year"] == f["producing_years"][0]
        else:
            assert f["first_production_year"] is None
    assert any(not f["producing_years"] for f in body)


def test_fields_approved_includes_old_fields_being_redeveloped(client):
    # "Approved for production" is not always a new field. Some old fields
    # that shut down are approved again for redevelopment.
    body = client.get("/api/fields").json()
    vest_ekofisk = next(f for f in body if f["name"] == "Vest Ekofisk")
    assert vest_ekofisk["status"] == "Approved for production"
    assert vest_ekofisk["first_production_year"] == 1977


def test_fields_only_shut_down_fields_have_a_last_year(client):
    body = client.get("/api/fields").json()
    for f in body:
        if f["last_production_year"] is not None:
            assert f["status"] == "Shut down"