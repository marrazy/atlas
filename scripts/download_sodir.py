# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://factmaps.sodir.no/api/rest/services/DataService/Data/FeatureServer"
OUT = Path(__file__).resolve().parent.parent / "data" / "raw"
PAGE = 2000

# layer id -> (file name, include field outline geometry)
LAYERS = {
    7100: ("field", True),        # field list with outlines
    7300: ("profiles", False),    # monthly and yearly production, investments
}


def get(url: str) -> dict:
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                data = json.load(r)
            if "error" in data:
                raise RuntimeError(data["error"])
            return data
        except Exception as e:  # network blips are common on large pulls
            wait = 2 ** attempt
            print(f"  retry {attempt + 1} in {wait}s: {e}", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"giving up on {url}")


def fetch(layer: int, geometry: bool) -> list[dict]:
    q = {"where": "1=1", "outFields": "*", "f": "json", "returnGeometry": str(geometry).lower()}
    if geometry:
        q |= {"outSR": "4326", "geometryPrecision": "4"}  # WGS84, about 10 m precision
    count = get(f"{BASE}/{layer}/query?" + urllib.parse.urlencode(q | {"returnCountOnly": "true"}))["count"]
    rows: list[dict] = []
    for offset in range(0, count, PAGE):
        page = get(f"{BASE}/{layer}/query?" + urllib.parse.urlencode(
            q | {"resultOffset": offset, "resultRecordCount": PAGE, "orderByFields": "OBJECTID"}))
        for feat in page["features"]:
            row = feat["attributes"]
            if geometry:
                row["_geometry"] = feat.get("geometry")
            rows.append(row)
    if len(rows) != count:
        raise RuntimeError(f"layer {layer}: expected {count} rows, got {len(rows)}")
    return rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for layer, (name, geometry) in LAYERS.items():
        print(f"downloading {name} (layer {layer})")
        rows = fetch(layer, geometry)
        (OUT / f"{name}.json").write_text(json.dumps(rows))
        print(f"  {len(rows):,} rows")
    meta = {"source": BASE, "licence": "NLOD 2.0", "downloaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"saved to {OUT}")


if __name__ == "__main__":
    main()
