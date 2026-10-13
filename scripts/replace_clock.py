"""Replace the '14:32' holo-clock text on the Canyon map with 'POD'. Source: frontend/canyon-map.original.jpg."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = "/app/frontend/canyon-map.original.jpg"
OUT = "/app/frontend/public/canyon-map-pod.jpg"
BOX = (598, 75, 684, 122)          # region holding the digits
CENTER = (637.5, 99.5)             # text centre
ANGLE = -14                        # PIL degrees (negative = clockwise), matches panel tilt
TEXT_H = 26                        # cap height in px

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
x0, y0, x1, y1 = BOX
reg = a[y0:y1, x0:x1].copy()

# Mask bright cyan glyph pixels (+ glow), dilated
g = reg[..., 1]
mask = g > 140
# keep the panel's top-right edge line (it runs through the box above the last digits)
yy, xx = np.mgrid[y0:y1, x0:x1]
mask &= ~((xx > 652) & (yy < 86))
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
mask = np.asarray(m) > 0

# Diffusion inpaint: repeatedly replace masked pixels with the mean of their neighbours
fill = reg.copy()
known = ~mask
fill[mask] = reg[known].mean(axis=0)
for _ in range(400):
    up = np.roll(fill, 1, 0); dn = np.roll(fill, -1, 0); lf = np.roll(fill, 1, 1); rt = np.roll(fill, -1, 1)
    avg = (up + dn + lf + rt) / 4
    fill[mask] = avg[mask]
# subtle noise so it matches the screen texture
rng = np.random.default_rng(7)
fill[mask] += rng.normal(0, 2.0, fill[mask].shape)
a[y0:y1, x0:x1] = np.clip(fill, 0, 255)
base = Image.fromarray(a.astype(np.uint8))

# Text layer, supersampled 4x
S = 4
font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", int(TEXT_H * 1.38 * S))
tmp = ImageDraw.Draw(Image.new("L", (1, 1)))
l, t, r, b = tmp.textbbox((0, 0), "POD", font=font)
pad = 40 * S
W, H = (r - l) + pad * 2, (b - t) + pad * 2
txt = Image.new("L", (W, H), 0)
ImageDraw.Draw(txt).text((pad - l, pad - t), "POD", font=font, fill=255)
txt = txt.rotate(ANGLE, resample=Image.BICUBIC, expand=True)
txt = txt.resize((txt.width // S, txt.height // S), Image.LANCZOS)

ox = int(round(CENTER[0] - txt.width / 2)); oy = int(round(CENTER[1] - txt.height / 2))
def stamp(layer_alpha, color, strength=1.0):
    col = Image.new("RGB", layer_alpha.size, color)
    alpha = layer_alpha.point(lambda v: int(min(255, v * strength)))
    base.paste(col, (ox, oy), alpha)

stamp(txt.filter(ImageFilter.GaussianBlur(6)), (0, 200, 255), 0.55)   # outer glow
stamp(txt.filter(ImageFilter.GaussianBlur(2.2)), (60, 230, 255), 0.85) # inner glow
stamp(txt, (165, 245, 255), 1.0)                                       # glyph
base.save(OUT, quality=95)
print("written", OUT, base.size)
