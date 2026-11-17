import pytest

from conftest import VOLVE


# GET /snapshot
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

# GET /fields

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

# GET /fields/outlines

def test_outlines_are_geojson(client):
    r = client.get("/api/fields/outlines")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/geo+json"
    body = r.json()
    assert body["type"] == "FeatureCollection"


def test_outlines_match_located_fields(client):
    outlines = client.get("/api/fields/outlines").json()["features"]
    fields = client.get("/api/fields").json()
    located = {f["field_id"] for f in fields if f["lon"] is not None}
    assert {o["properties"]["field_id"] for o in outlines} == located
    assert len(outlines) == 141  # every field except Sindre


def test_outlines_have_what_the_map_needs(client):
    feature = client.get("/api/fields/outlines").json()["features"][0]
    assert set(feature["properties"]) == {"field_id", "name", "main_product", "status"}
    assert feature["geometry"]["type"] == "MultiPolygon"


def test_outline_coordinates_are_on_the_norwegian_shelf(client):
    # GeoJSON order is [longitude, latitude], in WGS84 degrees
    for feature in client.get("/api/fields/outlines").json()["features"]:
        for polygon in feature["geometry"]["coordinates"]:
            for ring in polygon:
                assert ring[0] == ring[-1], "each ring must close on its first point"
                for lon, lat in ring:
                    assert -3 < lon < 35 and 56 < lat < 75


def test_outlines_are_compressed_and_cached(client):
    r = client.get("/api/fields/outlines", headers={"Accept-Encoding": "gzip"})
    assert r.headers["content-encoding"] == "gzip"
    assert r.headers["cache-control"] == "public, max-age=86400"

# GET /fields/{field_id}

def test_field_detail_volve(client):
    body = client.get(f"/api/fields/{VOLVE}").json()
    assert body["name"] == "Volve"
    assert body["main_area"] == "North sea"
    assert body["discovery_year"] == 1993
    assert body["factpage_url"].startswith("https://factpages.sodir.no")


def test_field_detail_volve_matches_equinor(client):
    body = client.get(f"/api/fields/{VOLVE}").json()
    # Equinor reports about 63 million barrels in total, and a plateau of about 56,000 barrels a day
    assert body["total_oil_gross_mmbbl"] == pytest.approx(63.3, abs=0.5)
    assert body["peak_oil_rate"] * 6.2898 == pytest.approx(56_000, rel=0.02)
    assert body["peak_oil_month"] == "2008-12"


def test_field_detail_includes_the_summary(client):
    # the detail must agree with the field's entry in the list
    summary = next(f for f in client.get("/api/fields").json() if f["field_id"] == VOLVE)
    detail = client.get(f"/api/fields/{VOLVE}").json()
    assert {k: detail[k] for k in summary} == summary


def test_field_detail_without_production(client):
    fields = client.get("/api/fields").json()
    berling = next(f for f in fields if f["name"] == "Berling")
    body = client.get(f"/api/fields/{berling['field_id']}").json()
    assert body["total_oil_gross_mmbbl"] == 0
    assert body["peak_oil_rate"] is None
    assert body["peak_oil_month"] is None


def test_field_detail_unknown_id_is_404(client):
    r = client.get("/api/fields/1")
    assert r.status_code == 404
    assert r.json() == {"detail": "no field with id 1"}


def test_field_detail_id_must_be_a_number(client):
    assert client.get("/api/fields/volve").status_code == 422


def test_outlines_still_reach_their_own_route(client):
    # /fields/outlines must not be read as /fields/{field_id}
    assert client.get("/api/fields/outlines").status_code == 200

# GET /api/fields/{field_id}/production

def test_production_volve_covers_its_whole_life(client):
    body = client.get(f"/api/fields/{VOLVE}/production").json()
    assert body[0]["month"] == "2008-02"
    assert body[-1]["month"] == "2016-09"
    assert len(body) == 104  # Feb 2008 to Sep 2016, no gaps


def test_production_months_are_in_order_with_no_repeats(client):
    months = [m["month"] for m in client.get(f"/api/fields/{VOLVE}/production").json()]
    assert months == sorted(months)
    assert len(set(months)) == len(months)


def test_production_rates_are_never_negative(client):
    # Sodir's correction months can be slightly negative, rates are clipped at zero
    body = client.get(f"/api/fields/{VOLVE}/production").json()
    assert all(m["oil_rate"] >= 0 and m["gas_rate"] >= 0 for m in body)


def test_production_peak_matches_field_detail(client):
    body = client.get(f"/api/fields/{VOLVE}/production").json()
    detail = client.get(f"/api/fields/{VOLVE}").json()
    peak = max(body, key=lambda m: m["oil_rate"])
    assert peak["month"] == detail["peak_oil_month"]
    assert peak["oil_rate"] == detail["peak_oil_rate"]


def test_production_gor_is_empty_without_gas(client):
    body = client.get(f"/api/fields/{VOLVE}/production").json()
    # Volve reported oil but no gas in its first three months
    assert [m["gor"] for m in body[:3]] == [None, None, None]
    assert body[0]["gas_rate"] == 0


def test_production_gor_matches_the_rates(client):
    for m in client.get(f"/api/fields/{VOLVE}/production").json():
        if m["gor"] is not None:
            assert m["gor"] > 0
            assert m["gor"] == pytest.approx(m["gas_rate"] / m["oil_rate"], rel=0.01)


def test_production_field_that_never_produced_is_empty(client):
    fields = client.get("/api/fields").json()
    berling = next(f for f in fields if f["name"] == "Berling")
    assert client.get(f"/api/fields/{berling['field_id']}/production").json() == []


def test_production_unknown_field_is_404(client):
    assert client.get("/api/fields/1/production").status_code == 404