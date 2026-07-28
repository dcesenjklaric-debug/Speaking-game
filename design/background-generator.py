"""Render the CSS radial-gradient stack offline so the shape and blending can be
checked without a browser."""
from PIL import Image

T = (0, 0, 0, 0)
BASE = (11, 7, 22)      # velvety black-purple, not flat black


def ramp(keys, amax, power=1.55, n=36):
    """Build n+1 evenly spaced stops: colour interpolated along `keys`, alpha on a
    smooth curve. Even spacing with small per-step deltas is what kills banding."""
    out = []
    for i in range(n + 1):
        t = i / n
        col = keys[-1][1]
        for j in range(len(keys) - 1):
            p0, c0 = keys[j]
            p1, c1 = keys[j + 1]
            if p0 <= t <= p1:
                k = 0 if p1 == p0 else (t - p0) / (p1 - p0)
                col = tuple(int(round(c0[m] + (c1[m] - c0[m]) * k)) for m in range(3))
                break
        a = int(round(amax * max(0.0, 1.0 - t ** power)))
        out.append((round(t, 3), col + (a,)))
    out[-1] = (1.0, T)
    return out


# (rx%, ry%, cx%, cy%, stops) - CSS order: first entry is painted on top
LAYERS = [
    # coral ribbon along the top edge
    (96, 17, 50, -3, ramp([
        (0.00, (255, 172, 144)), (0.30, (236, 146, 152)), (0.55, (182, 110, 138)),
        (0.78, (110, 66, 96)), (1.00, (54, 32, 58))], 248, 1.35)),
    # candle tip - white/yellow heart, then a LONG gentle fade that ends on the
    # dome's own violet so the flame's edge has nothing to contrast against
    (6, 47, 50, 100, ramp([
        (0.00, (255, 255, 252)), (0.14, (255, 253, 224)), (0.28, (255, 252, 236)),
        (0.44, (238, 238, 248)), (0.60, (196, 198, 244)), (0.74, (166, 158, 238)),
        (0.87, (150, 130, 234)), (1.00, (146, 112, 232))], 255, 1.15)),
    # candle base - same treatment, flaring at the floor
    (12, 24, 50, 100, ramp([
        (0.00, (255, 255, 248)), (0.16, (255, 252, 216)), (0.34, (253, 250, 238)),
        (0.52, (226, 226, 246)), (0.68, (192, 190, 242)), (0.84, (166, 150, 236)),
        (1.00, (150, 116, 232))], 255, 1.12)),
    # the semicircle - yellow-white core, blue/indigo mid, purple rim
    (33, 46, 50, 101, ramp([
        (0.00, (255, 253, 222)), (0.10, (255, 250, 232)), (0.22, (214, 220, 246)),
        (0.35, (152, 166, 242)), (0.47, (116, 126, 234)), (0.58, (122, 104, 232)),
        (0.70, (158, 96, 234)), (0.82, (190, 100, 238)), (0.92, (208, 116, 240)),
        (1.00, (220, 134, 244))], 248, 1.45)),
    # wide purple halo bridging the dome into the dark
    (66, 62, 50, 103, ramp([
        (0.00, (196, 118, 240)), (0.28, (168, 102, 226)), (0.56, (130, 80, 198)),
        (0.80, (88, 58, 150)), (1.00, (52, 38, 100))], 74, 1.25)),
    # soft plume around the flame
    (20, 52, 50, 101, ramp([
        (0.00, (226, 226, 248)), (0.26, (192, 188, 242)), (0.50, (160, 140, 232)),
        (0.74, (136, 92, 214)), (1.00, (80, 50, 144))], 104, 1.3)),
    # velvety indigo-purple haze in the upper frame
    (135, 72, 50, 26, ramp([
        (0.00, (54, 38, 108)), (0.55, (34, 25, 70)), (1.00, (20, 16, 44))], 66, 1.2)),
]


def sample(stops, d):
    if d <= stops[0][0]:
        return stops[0][1]
    if d >= stops[-1][0]:
        return stops[-1][1]
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        if p0 <= d <= p1:
            t = 0 if p1 == p0 else (d - p0) / (p1 - p0)
            a0, a1 = c0[3] / 255, c1[3] / 255          # premultiplied, as browsers do
            pm0 = [c0[j] * a0 for j in range(3)]
            pm1 = [c1[j] * a1 for j in range(3)]
            a = a0 + (a1 - a0) * t
            pm = [pm0[j] + (pm1[j] - pm0[j]) * t for j in range(3)]
            if a <= 0.0001:
                return (0, 0, 0, 0)
            return tuple(int(round(min(255, pm[j] / a))) for j in range(3)) + (int(round(a * 255)),)
    return stops[-1][1]


def render(W, H, path):
    im = Image.new('RGB', (W, H), BASE)
    px = im.load()
    for y in range(H):
        for x in range(W):
            r, g, b = float(BASE[0]), float(BASE[1]), float(BASE[2])
            for (rx, ry, cx, cy, stops) in reversed(LAYERS):   # bottom-up
                dx = (x - cx / 100 * W) / (rx / 100 * W)
                dy = (y - cy / 100 * H) / (ry / 100 * H)
                sr, sg, sb, sa = sample(stops, (dx * dx + dy * dy) ** 0.5)
                a = sa / 255
                if a > 0:
                    r = sr * a + r * (1 - a)
                    g = sg * a + g * (1 - a)
                    b = sb * a + b * (1 - a)
            px[x, y] = (int(r), int(g), int(b))
    im.save(path)
    return im


def css():
    """Emit the same stack as CSS so the HTML never drifts from what was rendered."""
    out = []
    for (rx, ry, cx, cy, stops) in LAYERS:
        parts = []
        for pos, (r, g, b, a) in stops:
            parts.append('transparent %g%%' % (pos * 100) if a == 0
                         else 'rgba(%d,%d,%d,%.3f) %g%%' % (r, g, b, a / 255, pos * 100))
        out.append('radial-gradient(ellipse %g%% %g%% at %g%% %g%%,\n        %s)'
                   % (rx, ry, cx, cy, ', '.join(parts)))
    return ',\n      '.join(out)


if __name__ == '__main__':
    import sys
    if sys.argv[1] == 'css':
        print(css())
    else:
        W, H, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
        print('rendered', out, render(W, H, out).size)
