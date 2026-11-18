"""Make frontend/src/assets/map/waterlines.geojson, the smooth coast the shelf map draws its waterlines along.

Design v2 draws three thin lines following the coast out to sea. Along the full coastline they crowd around every
small island and fjord, so this file keeps only the outer edge of larger land areas and smooths it to about 8 km.
It reads the land file made by make_land.py, with only the Python standard library:

    python3 scripts/make_waterlines.py frontend/src/assets/map/land.geojson frontend/src/assets/map/waterlines.geojson
"""
import json, sys

land_path, out_path = sys.argv[1], sys.argv[2]
TOLERANCE = 0.08  # degrees, about 8 km
MIN_AREA = 0.5  # square degrees; smaller islands get no waterlines

def area(ring):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2

def simplify(points):
    if len(points) < 4:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = points[a], points[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        far, idx = 0.0, None
        for i in range(a + 1, b):
            d = abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / norm
            if d > far:
                far, idx = d, i
        if idx is not None and far > TOLERANCE:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]

land = json.load(open(land_path))
lines = []
for polygon in land["features"][0]["geometry"]["coordinates"]:
    outer = polygon[0]
    if area(outer) < MIN_AREA:
        continue
    # keep the ring's direction, so a negative line offset still moves the line out to sea
    smooth = simplify(outer[:-1]) + [outer[0]]
    if len(smooth) >= 4:
        lines.append([[round(x, 3), round(y, 3)] for x, y in smooth])

out = {
    "type": "FeatureCollection",
    "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "MultiLineString", "coordinates": lines}}],
}
with open(out_path, "w") as f:
    json.dump(out, f, separators=(",", ":"))
print(f"{len(lines)} coast lines, {sum(len(l) for l in lines):,} points")
