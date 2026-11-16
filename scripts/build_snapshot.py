# /// script
# requires-python = ">=3.12"
# dependencies = ["pandas>=2.2", "pyarrow>=17"]
# ///
import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "backend" / "data"

PROD_COLUMNS = {
    "prfPrdOilNetMillSm3": "oil_net_msm3",
    "prfPrdOilGrossMillSm3": "oil_gross_msm3",
    "prfPrdGasNetBillSm3": "gas_net_bsm3",
    "prfPrdGasGrossBillSm3": "gas_gross_bsm3",
    "prfPrdNGLNetMillSm3": "ngl_net_msm3",
    "prfPrdCondensateNetMillSm3": "condensate_net_msm3",
    "prfPrdCondensateGrossMillSm3": "condensate_gross_msm3",
    "prfPrdOeNetMillSm3": "oe_net_msm3",
    "prfPrdOeGrossMillSm3": "oe_gross_msm3",
}
# Sodir's produced water column is empty for every row in the API, so it is left out.


def nice_name(raw: str) -> str:
    """'JOHAN SVERDRUP' -> 'Johan Sverdrup', keeps roman numerals like 'TOR II'."""
    words = []
    for w in raw.split(" "):
        if re.fullmatch(r"[IVX]+", w):
            words.append(w)
        else:
            words.append("-".join(part.capitalize() for part in w.split("-")))
    return " ".join(words)


def short_operator(name: str | None) -> str | None:
    if not name:
        return None
    for key, short in (("Equinor", "Equinor"), ("ConocoPhillips", "ConocoPhillips"), ("Shell", "Shell"),
                       ("Aker BP", "Aker BP"), ("Vår Energi", "Vår Energi"), ("OKEA", "OKEA"),
                       ("Harbour", "Harbour Energy"), ("DNO", "DNO")):
        if key in name:
            return short
    return re.sub(r"\s+(ASA|AS)$", "", name)


def build_production(profiles: pd.DataFrame) -> pd.DataFrame:
    m = profiles[(profiles.prfPeriod == "month") & (profiles.prfInformationCarrierKind == "FIELD")]
    m = m.rename(columns=PROD_COLUMNS | {"prfNpdidInformationCarrier": "field_id", "prfYear": "year", "prfMonth": "month"})
    m = m[["field_id", "year", "month", *PROD_COLUMNS.values()]].copy()
    m[list(PROD_COLUMNS.values())] = m[list(PROD_COLUMNS.values())].fillna(0.0)
    m = m.astype({"field_id": "int64", "year": "int16", "month": "int8"})
    m.insert(3, "date", pd.to_datetime(dict(year=m.year, month=m.month, day=1)))
    # liquids = oil + NGL + condensate, the "oil" used in the shelf charts
    m["liquids_net_msm3"] = m.oil_net_msm3 + m.ngl_net_msm3 + m.condensate_net_msm3
    return m.sort_values(["field_id", "date"]).reset_index(drop=True)


def build_investments(profiles: pd.DataFrame) -> pd.DataFrame:
    y = profiles[(profiles.prfPeriod == "year") & (profiles.prfInformationCarrierKind == "FIELD")]
    y = y.rename(columns={"prfNpdidInformationCarrier": "field_id", "prfYear": "year", "prfInvestmentsMillNOK": "investment_mnok"})
    y = y[["field_id", "year", "investment_mnok"]].dropna()
    y = y[y.investment_mnok > 0].astype({"field_id": "int64", "year": "int16"})
    return y.sort_values(["field_id", "year"]).reset_index(drop=True)


def build_fields(raw_fields: list[dict], prod: pd.DataFrame) -> pd.DataFrame:
    producing = prod[prod.oe_net_msm3 > 0]
    first = producing.groupby("field_id").year.min()
    last = producing.groupby("field_id").year.max()
    totals = prod.groupby("field_id")[["oe_net_msm3", "liquids_net_msm3", "gas_net_bsm3"]].sum()
    rows = []
    for f in raw_fields:
        fid = int(f["fldNpdidField"])
        rings = (f.get("_geometry") or {}).get("rings") or []
        if rings:
            outer = max(rings, key=len)
            lon = sum(p[0] for p in outer) / len(outer)
            lat = sum(p[1] for p in outer) / len(outer)
        else:
            lon = lat = None
        t = totals.loc[fid] if fid in totals.index else None
        cum_liq = float(t.liquids_net_msm3) if t is not None else 0.0
        cum_gas = float(t.gas_net_bsm3) if t is not None else 0.0
        if cum_liq + cum_gas > 0:
            main_product = "oil" if cum_liq >= cum_gas else "gas"  # 1 BSm3 gas = 1 MSm3 o.e.
        else:
            main_product = "gas" if str(f["fldHcType"]).startswith("GAS") else "oil"
        status = f["fldCurrentActivitySatus"]
        rows.append({
            "field_id": fid,
            "name": nice_name(f["fldName"]),
            "status": status,
            "main_product": main_product,
            "hc_type": f["fldHcType"],
            "main_area": f["fldMainArea"],
            "operator": short_operator(f["cmpLongName"]),
            "operator_full": f["cmpLongName"],
            "discovery_year": f["fldDiscoveryYear"],
            "lon": round(lon, 4) if lon is not None else None,
            "lat": round(lat, 4) if lat is not None else None,
            "first_production_year": int(first[fid]) if fid in first.index else None,
            "last_production_year": int(last[fid]) if (fid in last.index and status == "Shut down") else None,
            "cum_oe_net_msm3": round(float(t.oe_net_msm3), 3) if t is not None else 0.0,
            "cum_liquids_net_msm3": round(cum_liq, 3),
            "cum_gas_net_bsm3": round(cum_gas, 3),
            "factpage_url": f["fldFactPageUrl"],
        })
    df = pd.DataFrame(rows).astype({"first_production_year": "Int16", "last_production_year": "Int16", "discovery_year": "Int16"})
    return df.sort_values("cum_oe_net_msm3", ascending=False).reset_index(drop=True)


def build_outlines(raw_fields: list[dict], fields: pd.DataFrame) -> dict:
    """Esri rings -> GeoJSON. Each Sodir field outline is treated as a MultiPolygon of its rings."""
    meta = fields.set_index("field_id")
    features = []
    for f in raw_fields:
        rings = (f.get("_geometry") or {}).get("rings") or []
        if not rings:
            continue
        fid = int(f["fldNpdidField"])
        features.append({
            "type": "Feature",
            "properties": {"field_id": fid, "name": meta.at[fid, "name"], "main_product": meta.at[fid, "main_product"],
                           "status": meta.at[fid, "status"]},
            "geometry": {"type": "MultiPolygon", "coordinates": [[ring] for ring in rings]},
        })
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    raw_fields = json.loads((RAW / "field.json").read_text())
    profiles = pd.DataFrame(json.loads((RAW / "profiles.json").read_text()))
    meta = json.loads((RAW / "meta.json").read_text()) if (RAW / "meta.json").exists() else {}

    prod = build_production(profiles)
    inv = build_investments(profiles)
    fields = build_fields(raw_fields, prod)
    outlines = build_outlines(raw_fields, fields)

    OUT.mkdir(parents=True, exist_ok=True)
    fields.to_parquet(OUT / "fields.parquet", index=False)
    prod.to_parquet(OUT / "production_monthly.parquet", index=False)
    inv.to_parquet(OUT / "investments_yearly.parquet", index=False)
    (OUT / "field_outlines.geojson").write_text(json.dumps(outlines, separators=(",", ":")))
    last = prod.date.max()
    snapshot = meta | {
        "last_month": last.strftime("%Y-%m"),
        "last_full_year": int(last.year if last.month == 12 else last.year - 1),
        "fields": int(len(fields)),
        "fields_without_outline": sorted(fields.loc[fields.lon.isna(), "name"].tolist()),
        "production_rows": int(len(prod)),
        "rows_with_negative_adjustments": int((prod.filter(regex="_(msm3|bsm3)$") < 0).any(axis=1).sum()),
        "attribution": "Data from the Norwegian Offshore Directorate (Sodir), Norwegian Licence for Open Government Data (NLOD).",
    }
    (OUT / "snapshot.json").write_text(json.dumps(snapshot, indent=2))
    print(f"{len(fields)} fields, {len(prod):,} monthly rows up to {snapshot['last_month']}, {len(inv):,} investment rows")
    print(f"saved to {OUT}")


if __name__ == "__main__":
    main()