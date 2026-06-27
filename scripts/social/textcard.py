#!/usr/bin/env python3
"""Render text to a transparent PNG using brand fonts, for ffmpeg `overlay`.
This pipeline's ffmpeg has no drawtext (no libfreetype), so text is composited
as PNGs instead. Canvas is full target width; height fits the text band.
"""
import argparse
from PIL import Image, ImageDraw, ImageFont


def hex_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True, help="use \\n for line breaks")
    ap.add_argument("--out", required=True)
    ap.add_argument("--font", required=True)
    ap.add_argument("--size", type=int, required=True)
    ap.add_argument("--color", default="#F0ECE2")
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--align", default="center", choices=["center", "left", "right"])
    ap.add_argument("--box", action="store_true")
    ap.add_argument("--boxcolor", default="#08090B")
    ap.add_argument("--boxalpha", type=int, default=168)
    ap.add_argument("--pad", type=int, default=28)
    ap.add_argument("--linespacing", type=int, default=14)
    ap.add_argument("--shadow", action="store_true")
    a = ap.parse_args()

    lines = a.text.split("\\n")
    font = ImageFont.truetype(a.font, a.size)
    ascent, descent = font.getmetrics()
    line_h = ascent + descent

    tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    widths = [tmp.textlength(ln, font=font) for ln in lines]
    text_w = int(max(widths)) if widths else 0
    text_h = line_h * len(lines) + a.linespacing * (len(lines) - 1)

    W = a.width
    H = text_h + 2 * a.pad
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if a.box:
        bc = hex_rgb(a.boxcolor) + (a.boxalpha,)
        bx0 = (W - text_w) // 2 - a.pad
        bx1 = (W + text_w) // 2 + a.pad
        draw.rectangle([bx0, 0, bx1, H], fill=bc)

    color = hex_rgb(a.color) + (255,)
    y = a.pad
    for ln, w in zip(lines, widths):
        if a.align == "center":
            x = (W - w) / 2
        elif a.align == "left":
            x = a.pad
        else:
            x = W - w - a.pad
        if a.shadow:
            draw.text((x + 3, y + 3), ln, font=font, fill=(0, 0, 0, 180))
        draw.text((x, y), ln, font=font, fill=color)
        y += line_h + a.linespacing

    img.save(a.out)
    print(f"wrote {a.out} {W}x{H}")


if __name__ == "__main__":
    main()
