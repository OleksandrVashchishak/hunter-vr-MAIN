"""Punch out opaque light furniture-stamp fills in minimap PNGs.

Designer export left light-gray rectangles under furniture. CSS multiply
cannot fix this: the rest of the plan is light strokes on transparent,
so multiply would erase the map too. We remove the stamp blobs instead.
"""

from __future__ import annotations

import shutil
import statistics
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets" / "minimap"

BRIGHT = 185


def fix_plan(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()

    visited = [[False] * w for _ in range(h)]
    components: list[tuple[list[tuple[int, int]], float]] = []

    for y in range(h):
        for x in range(w):
            if visited[y][x]:
                continue
            r, g, b, a = px[x, y]
            L = (r + g + b) / 3.0
            if a < 100 or L < BRIGHT:
                visited[y][x] = True
                continue
            stack = [(x, y)]
            visited[y][x] = True
            cells: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                        rr, gg, bb, aa = px[nx, ny]
                        nL = (rr + gg + bb) / 3.0
                        if aa >= 100 and nL >= BRIGHT:
                            visited[ny][nx] = True
                            stack.append((nx, ny))
            if len(cells) < 10:
                continue
            xs = [c[0] for c in cells]
            ys = [c[1] for c in cells]
            bw = max(xs) - min(xs) + 1
            bh = max(ys) - min(ys) + 1
            fill_ratio = len(cells) / (bw * bh)
            if fill_ratio < 0.22:
                continue
            if min(bw, bh) <= 2 and max(bw, bh) > 15:
                continue
            fill_L = statistics.median(
                [(px[x, y][0] + px[x, y][1] + px[x, y][2]) / 3.0 for x, y in cells]
            )
            components.append((cells, fill_L))

    out = im.copy()
    opx = out.load()
    cleared = 0

    for cells, fill_L in components:
        xs = [c[0] for c in cells]
        ys = [c[1] for c in cells]
        minx, maxx = max(0, min(xs) - 2), min(w - 1, max(xs) + 2)
        miny, maxy = max(0, min(ys) - 2), min(h - 1, max(ys) + 2)

        seen = set(cells)
        q = list(cells)
        region = set(cells)
        i = 0
        while i < len(q):
            cx, cy = q[i]
            i += 1
            for nx, ny in (
                (cx + 1, cy),
                (cx - 1, cy),
                (cx, cy + 1),
                (cx, cy - 1),
                (cx + 1, cy + 1),
                (cx - 1, cy - 1),
                (cx + 1, cy - 1),
                (cx - 1, cy + 1),
            ):
                if not (minx <= nx <= maxx and miny <= ny <= maxy):
                    continue
                if (nx, ny) in seen:
                    continue
                rr, gg, bb, aa = px[nx, ny]
                if aa < 40:
                    continue
                nL = (rr + gg + bb) / 3.0
                if nL >= BRIGHT or nL < fill_L - 8:
                    seen.add((nx, ny))
                    region.add((nx, ny))
                    q.append((nx, ny))

        for x, y in region:
            opx[x, y] = (0, 0, 0, 0)
            cleared += 1

    out.save(src)
    print(f"{src.name}: stamps={len(components)} punched={cleared}")


def main() -> None:
    for name in ("floor-i", "floor-ii", "floor-iii"):
        src = ASSETS / f"{name}.png"
        bak = ASSETS / f"{name}.bak.png"
        if bak.exists():
            shutil.copy2(bak, src)
        else:
            shutil.copy2(src, bak)
        fix_plan(src)


if __name__ == "__main__":
    main()
