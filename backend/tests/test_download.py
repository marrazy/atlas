import json
from pathlib import Path

import pandas as pd
import pytest

DATA = Path(__file__).resolve().parent.parent / "data"
SM3_TO_BBL = 6.2898  # barrels per standard cubic metre


@pytest.fixture(scope="module")
def fields() -> pd.DataFrame:
    return pd.read_parquet(DATA / "fields.parquet")


@pytest.fixture(scope="module")
def prod() -> pd.DataFrame:
    return pd.read_parquet(DATA / "production_monthly.parquet")


@pytest.fixture(scope="module")
def volve(fields, prod) -> pd.DataFrame:
    fid = fields.loc[fields.name == "Volve", "field_id"].item()
    return prod[prod.field_id == fid].sort_values("date")


# ---------- shape of the data ----------

def test_one_row_per_field_and_month(prod):
    assert not prod.duplicated(["field_id", "year", "month"]).any()


def test_negative_values_are_only_small_corrections(prod):
    # Sodir publishes small negative months that correct earlier over-reporting
    volumes = prod.filter(regex="_(msm3|bsm3)$")
    assert volumes.min().min() > -0.15


def test_no_field_total_is_negative(prod):
    totals = prod.groupby("field_id")[["oe_net_msm3", "oe_gross_msm3"]].sum()
    assert (totals >= -1e-6).all().all()


def test_every_production_row_has_a_known_field(fields, prod):
    assert set(prod.field_id) <= set(fields.field_id)


def test_fields_have_locations(fields):
    snap = json.loads((DATA / "snapshot.json").read_text())
    missing = set(fields.loc[fields.lon.isna(), "name"])
    assert missing == set(snap["fields_without_outline"])
    assert len(missing) <= 2
    # every located field sits on the Norwegian shelf
    located = fields.dropna(subset=["lon", "lat"])
    assert located.lat.between(56, 75).all()
    assert located.lon.between(-3, 35).all()


def test_outlines_cover_located_fields(fields):
    geo = json.loads((DATA / "field_outlines.geojson").read_text())
    ids = {f["properties"]["field_id"] for f in geo["features"]}
    assert ids == set(fields.dropna(subset=["lon"]).field_id)


def test_snapshot_metadata():
    snap = json.loads((DATA / "snapshot.json").read_text())
    assert snap["last_month"] >= "2026-08"
    assert "Sodir" in snap["attribution"]


# ---------- known facts ----------

def test_ekofisk_started_in_1971(fields):
    assert fields.loc[fields.name == "Ekofisk", "first_production_year"].item() == 1971


def test_shelf_peak_was_2004_at_264_msm3_oe(prod):
    yearly = prod[prod.year <= 2025].groupby("year").oe_net_msm3.sum()
    assert yearly.idxmax() == 2004
    assert yearly.max() == pytest.approx(264, abs=1)


def test_troll_is_the_largest_field(fields):
    assert fields.iloc[0]["name"] == "Troll"


def test_volve_dates(volve):
    producing = volve[volve.oil_gross_msm3 > 0]
    assert producing.date.min() == pd.Timestamp("2008-02-01")
    assert producing.date.max() == pd.Timestamp("2016-09-01")


def test_volve_total_oil_matches_equinor(volve):
    # Equinor reports about 63 million barrels in total
    total_mmbbl = volve.oil_gross_msm3.sum() * SM3_TO_BBL
    assert total_mmbbl == pytest.approx(63.3, abs=0.5)


def test_volve_peak_rate_matches_equinor(volve):
    # Equinor reports a plateau of about 56,000 barrels per day
    days = volve.date.dt.days_in_month
    peak_bbl_per_day = (volve.oil_gross_msm3 * 1e6 / days).max() * SM3_TO_BBL
    assert peak_bbl_per_day == pytest.approx(56_000, rel=0.02)


def test_johan_sverdrup_started_in_2019(fields):
    assert fields.loc[fields.name == "Johan Sverdrup", "first_production_year"].item() == 2019