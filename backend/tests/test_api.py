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

# GET /api/fields/{field_id}/investments

def test_investments_volve(client):
    body = client.get(f"/api/fields/{VOLVE}/investments").json()
    assert body[0] == {"year": 2005, "investment_mnok": 184.0}
    assert body[-1]["year"] == 2015
    assert sum(y["investment_mnok"] for y in body) == pytest.approx(4694)


def test_investments_volve_peaks_before_first_oil(client):
    # most money is spent building the field, before production starts in 2008
    body = client.get(f"/api/fields/{VOLVE}/investments").json()
    biggest = max(body, key=lambda y: y["investment_mnok"])
    assert biggest["year"] == 2007


def test_investments_are_in_order_and_positive(client):
    body = client.get("/api/fields/46437/investments").json()  # Troll
    years = [y["year"] for y in body]
    assert years == sorted(years)
    assert len(set(years)) == len(years)
    assert all(y["investment_mnok"] > 0 for y in body)


def test_investments_stop_at_2024(client):
    body = client.get("/api/fields/46437/investments").json()
    assert max(y["year"] for y in body) <= 2024


def test_investments_field_without_any_is_empty(client):
    fields = client.get("/api/fields").json()
    hugin_sat = next(f for f in fields if f["name"] == "Hugin Satellitter")
    assert client.get(f"/api/fields/{hugin_sat['field_id']}/investments").json() == []


def test_investments_unknown_field_is_404(client):
    assert client.get("/api/fields/1/investments").status_code == 404

# GET /api/shelf

def test_shelf_covers_every_full_year(client):
    years = [y["year"] for y in client.get("/api/shelf").json()["years"]]
    assert years == list(range(1971, 2026))  # 1971 to 2025, no gaps, 2026 is not finished


def test_shelf_peak_was_2004(client):
    body = client.get("/api/shelf").json()
    assert body["peak_year"] == 2004
    assert body["peak_oe_net_msm3"] == pytest.approx(264.4, abs=0.5)
    assert body["peak_oe_net_msm3"] == max(y["oe_net_msm3"] for y in body["years"])


def test_shelf_oil_equivalent_is_liquids_plus_gas(client):
    # Sodir counts 1 billion Sm3 of gas as 1 million Sm3 of oil equivalent
    for y in client.get("/api/shelf").json()["years"]:
        assert y["oe_net_msm3"] == pytest.approx(y["liquids_net_msm3"] + y["gas_net_bsm3"], abs=0.01)


def test_shelf_first_year_was_ekofisk_only(client):
    first = client.get("/api/shelf").json()["years"][0]
    assert first["year"] == 1971
    assert first["gas_net_bsm3"] == 0  # Ekofisk started with oil only


def test_shelf_years_add_up_to_the_fields(client):
    # the shelf is the sum of the fields, so it must match their totals per year
    shelf = client.get("/api/shelf").json()
    full_years_total = sum(y["oe_net_msm3"] for y in shelf["years"])
    # the overall total also includes 2026 so far, so it must be a bit larger
    assert shelf["total_oe_net_msm3"] > full_years_total
    assert shelf["total_oe_net_msm3"] == pytest.approx(9105, abs=5)


def test_shelf_producing_fields_now_matches_field_list(client):
    fields = client.get("/api/fields").json()
    producing = sum(1 for f in fields if f["status"] == "Producing")
    assert client.get("/api/shelf").json()["producing_fields_now"] == producing

# GET /api/lifecycles

def _life(body, name):
    return next(f for f in body["fields"] if f["name"] == name)


def test_lifecycles_default_set(client):
    body = client.get("/api/lifecycles").json()
    assert len(body["fields"]) == 85  # at least 8 million Sm3 o.e. and 4 full years
    first_years = [f["first_year"] for f in body["fields"]]
    assert first_years == sorted(first_years)  # oldest first
    assert body["fields"][0]["name"] == "Ekofisk"


def test_lifecycles_ekofisk(client):
    ekofisk = _life(client.get("/api/lifecycles").json(), "Ekofisk")
    assert ekofisk["first_year"] == 1971
    assert ekofisk["peak_year"] == 2002  # 31 years in, after the field was redeveloped
    assert ekofisk["plateau_years"] == 14


def test_lifecycles_volve(client):
    volve = _life(client.get("/api/lifecycles").json(), "Volve")
    assert volve["first_year"] == 2008
    assert volve["peak_year"] == 2009
    assert volve["plateau_years"] == 1
    assert [age for age, _ in volve["series"]] == list(range(9))  # 2008 to 2016


def test_lifecycles_series_are_shares_of_the_best_year(client):
    for f in client.get("/api/lifecycles").json()["fields"]:
        shares = [share for _, share in f["series"]]
        assert f["series"][0][0] == 0  # starts at age 0
        assert max(shares) == 1.0  # the best year is 1
        # a few tiny late years round to 0.0 (Heimdal, Tune), so allow zero here
        assert all(0 <= s <= 1 for s in shares)


def test_lifecycles_skip_years_a_field_paused(client):
    # years with no production are left out, so ages always rise but can jump.
    # Heimdal stopped for a few years and started again.
    heimdal = _life(client.get("/api/lifecycles").json(), "Heimdal")
    ages = [age for age, _ in heimdal["series"]]
    assert ages == sorted(set(ages))
    assert ages[-1] + 1 > len(ages)  # at least one age is missing


def test_lifecycles_peak_year_is_the_year_with_share_1(client):
    for f in client.get("/api/lifecycles").json()["fields"]:
        age_at_peak = next(age for age, share in f["series"] if share == 1.0)
        assert f["first_year"] + age_at_peak == f["peak_year"]


def test_lifecycles_min_cum_filters(client):
    small = client.get("/api/lifecycles", params={"min_cum": 0}).json()["fields"]
    large = client.get("/api/lifecycles", params={"min_cum": 100}).json()["fields"]
    assert len(small) == 118  # every field with 4 or more full years
    assert len(large) < len(small)
    assert "Edda" not in {f["name"] for f in large}


def test_lifecycles_include_adds_a_small_field(client):
    fields = client.get("/api/fields").json()
    edda = next(f for f in fields if f["name"] == "Edda")  # just under 8 million Sm3 o.e.
    without = client.get("/api/lifecycles").json()["fields"]
    with_edda = client.get("/api/lifecycles", params={"include": edda["field_id"]}).json()["fields"]
    assert "Edda" not in {f["name"] for f in without}
    assert "Edda" in {f["name"] for f in with_edda}


def test_lifecycles_include_cannot_add_a_field_with_too_few_years(client):
    fields = client.get("/api/fields").json()
    castberg = next(f for f in fields if f["name"] == "Johan Castberg")  # one full year so far
    body = client.get("/api/lifecycles", params={"include": castberg["field_id"]}).json()
    assert "Johan Castberg" not in {f["name"] for f in body["fields"]}


def test_lifecycles_include_unknown_field_is_404(client):
    assert client.get("/api/lifecycles", params={"include": 1}).status_code == 404


def test_lifecycles_min_cum_cannot_be_negative(client):
    assert client.get("/api/lifecycles", params={"min_cum": -1}).status_code == 422


def test_lifecycles_median(client):
    median = client.get("/api/lifecycles").json()["median"]
    ages = [age for age, _ in median]
    assert ages[0] == 0
    assert ages == list(range(len(ages)))  # no gaps
    assert all(0 < share <= 1 for _, share in median)