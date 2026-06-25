#!/usr/bin/env python3
"""Curate + optimize SOLUM product photos into web/public/products/<NN>/*.webp.
Re-runnable. Source photos are local-only (not committed)."""
import os, sys
from PIL import Image

SRC = os.path.expanduser("~/Downloads/solum-photo-download-1of1/Highlights")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "products")
def src(n): return os.path.join(SRC, f"SOCO_SOLUM_SE-{n}.jpg")

# folder -> {output name: source SE number}.  (still + 3 gallery: use-1,use-2,detail)
# use-1 is the lead model shot (drives ritual tiles, card hovers, first gallery image) —
# prefer a FULL-FACE-with-product frame for connection; body/action shots follow as use-2/detail.
MANIFEST = {
  "01": {"still":4,  "use-1":86, "use-2":77, "detail":84},
  "02": {"still":56, "use-1":136,"use-2":146,"detail":135},
  "03": {"still":59, "use-1":128,"use-2":124,"detail":51},
  "04": {"still":28, "use-1":116,"use-2":119,"detail":26},
  "05": {"still":16, "use-1":109,"use-2":108,"detail":22},
  "06": {"still":24, "use-1":99, "use-2":92, "detail":25},
  "07": {"still":30, "use-1":31, "use-2":32},
  "08": {"still":39, "use-1":41, "use-2":43, "detail":42},
  "11": {"still":35, "use-1":33, "use-2":36},
  "kit": {"still":61, "use-1":62, "use-2":66},
}
LARGE, MOBILE, Q = 1200, 600, 80

def save(im, path, w):
    im2 = im.copy(); im2.thumbnail((w, w*4), Image.LANCZOS)
    im2.save(path, "WEBP", quality=Q, method=6)

for folder, shots in MANIFEST.items():
    d = os.path.join(OUT, folder); os.makedirs(d, exist_ok=True)
    for name, n in shots.items():
        p = src(n)
        if not os.path.exists(p): sys.exit(f"missing source {p}")
        im = Image.open(p).convert("RGB")
        save(im, os.path.join(d, f"{name}.webp"), LARGE)
        if name == "still":
            save(im, os.path.join(d, "still@600.webp"), MOBILE)
        print(folder, name, "<-", os.path.basename(p))
print("done")
