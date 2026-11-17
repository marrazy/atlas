"""Make frontend/src/assets/map/land.geojson, the coastline under the shelf map.

Source: Natural Earth 1:10m land, version 5.1.1, public domain (naturalearthdata.com/about/terms-of-use).
Download it first:

    curl -fsSLO https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip

Then run, with only the Python standard library:

    python3 scripts/make_land.py ne_10m_land.zip frontend/src/assets/map/land.geojson

It cuts the land to a box around the Norwegian shelf (30°W to 60°E, 46°N to 80°N) and simplifies it to about 300 m.
"""
import json, struct, sys, zipfile

zip_path, out_path = sys.argv[1], sys.argv[2]
WEST, EAST, SOUTH, NORTH = -30.0, 60.0, 46.0, 80.0
TOLERANCE = 0.003  # degrees, about 300 m

shp = zipfile.ZipFile(zip_path).read("ne_10m_land.shp")

def rings_from_shp(data):
    pos = 100
    while pos < len(data):
        _, length = struct.unpack(">ii", data[pos:pos + 8])
        content = data[pos + 8: pos + 8 + length * 2]
        pos += 8 + length * 2
        if struct.unpack("<i", content[:4])[0] != 5:
            continue
        num_parts, num_points = struct.unpack("<ii", content[36:44])
        parts = list(struct.unpack(f"<{num_parts}i", content[44:44 + 4 * num_parts])) + [num_points]
        pts_start = 44 + 4 * num_parts
        pts = [struct.unpack("<2d", content[pts_start + 16 * i: pts_start + 16 * i + 16]) for i in range(num_points)]
        for a, b in zip(parts, parts[1:]):
            yield pts[a:b]

def clip(ring):
    def edge(points, inside, cross):
        out = []
        for i, cur in enumerate(points):
            prev = points[i - 1]
            if inside(cur):
                if not inside(prev):
                    out.append(cross(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(cross(prev, cur))
        return out
    def at_x(x):
        return lambda p, q: (x, p[1] + (q[1] - p[1]) * (x - p[0]) / (q[0] - p[0]))
    def at_y(y):
        return lambda p, q: (p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]), y)
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    for inside, cross in [
        (lambda p: p[0] >= WEST, at_x(WEST)), (lambda p: p[0] <= EAST, at_x(EAST)),
        (lambda p: p[1] >= SOUTH, at_y(SOUTH)), (lambda p: p[1] <= NORTH, at_y(NORTH)),
    ]:
        if not pts:
            return []
        pts = edge(pts, inside, cross)
    return pts

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

def is_clockwise(ring):
    return sum((q[0] - p[0]) * (q[1] + p[1]) for p, q in zip(ring, ring[1:] + ring[:1])) > 0

polygons, total_in, total_out = [], 0, 0
for ring in rings_from_shp(shp):
    total_in += len(ring)
    outer = is_clockwise(ring)
    cut = clip(ring)
    if len(cut) < 3:
        continue
    # simplify the open outline: a closed ring starts and ends on one point, which would make every distance 0
    small = simplify(cut)
    small = small + [small[0]]
    small = [(round(x, 3), round(y, 3)) for x, y in small]
    small = [p for i, p in enumerate(small) if i == 0 or p != small[i - 1]]
    if len(small) < 4:
        continue
    total_out += len(small)
    ring_out = [list(p) for p in small]
    if outer or not polygons:
        polygons.append([ring_out])
    else:
        polygons[-1].append(ring_out)

feature = {
    "type": "FeatureCollection",
    "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "MultiPolygon", "coordinates": polygons}}],
}
with open(out_path, "w") as f:
    json.dump(feature, f, separators=(",", ":"))
print(f"rings kept {sum(len(p) for p in polygons)} in {len(polygons)} polygons, points {total_in:,} -> {total_out:,}")
