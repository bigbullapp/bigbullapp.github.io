#!/usr/bin/env python3
"""Regenerates all BigBullApp Nuvio & Stremio stream card badges at 203px height."""
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BADGES_JSON = ROOT / "badges" / "bigbull-badges.json"
ICONS_DIR = ROOT / "badges" / "icons"

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\bahnschrift.ttf",
]
SIG_FONT_CANDIDATES = [
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arial.ttf",
]

GROUP_FALLBACK_HEX = {
    "resolution": "#06B6D4",
    "visual": "#F59E0B",
    "source": "#818CF8",
    "video-codec": "#38BDF8",
    "audio-codec": "#F472B6",
    "channels": "#A78BFA",
    "container": "#34D399",
    "audio": "#FBBF24",
    "subtitles": "#60A5FA",
    "language": "#FB7185",
    "edition": "#F97316",
    "streaming-global": "#E11D48",
    "streaming-tr": "#10B981",
}

TARGET_HEIGHT = 203
SCALE = 2
H = TARGET_HEIGHT * SCALE  # 406px supersampled canvas


def _load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if Path(path).is_file():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _sample_accent(icon_path: Path, group_id: str) -> tuple[int, int, int]:
    fallback = _hex_to_rgb(GROUP_FALLBACK_HEX.get(group_id, "#38BDF8"))
    if not icon_path.is_file():
        return fallback
    try:
        im = Image.open(icon_path).convert("RGBA")
        # Scan border/midground pixels for highest chroma vibrant accent
        best = None
        best_score = 0.0
        for r, g, b, a in im.getdata():
            if a < 180:
                continue
            hi = max(r, g, b)
            lo = min(r, g, b)
            sat = hi - lo
            if sat < 28 or hi < 90:
                continue
            score = sat * 1.4 + hi * 0.4
            if score > best_score:
                best_score = score
                best = (r, g, b)
        return best if best is not None else fallback
    except Exception:
        return fallback


def _display_label(name: str) -> str:
    label = name.strip()
    # Keep trademark casing where helpful, otherwise crisp display uppercase for short tags
    if len(label) <= 6 or label.isupper():
        return label.upper()
    return label


def render_badge(label: str, accent: tuple[int, int, int], out_path: Path) -> tuple[int, int]:
    font_main = _load_font(FONT_CANDIDATES, int(H * 0.42))
    font_sig = _load_font(SIG_FONT_CANDIDATES, int(H * 0.135))

    probe = Image.new("RGBA", (10, 10))
    pdraw = ImageDraw.Draw(probe)
    text_bbox = pdraw.textbbox((0, 0), label, font=font_main)
    text_w = text_bbox[2] - text_bbox[0]
    sig_bbox = pdraw.textbbox((0, 0), "bigbullapp", font=font_sig)
    sig_w = sig_bbox[2] - sig_bbox[0]

    margin_x = int(H * 0.14)
    margin_y = int(H * 0.08)
    pad_x = int(H * 0.34)
    pill_w = max(int(H * 1.85), max(text_w, sig_w + int(H * 0.4)) + pad_x * 2)
    pill_h = H - margin_y * 2
    canvas_w = pill_w + margin_x * 2
    canvas_h = H

    # Outer neon glow layer
    glow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow_layer)
    radius = pill_h // 2
    box = [margin_x, margin_y, canvas_w - margin_x - 1, canvas_h - margin_y - 1]
    gdraw.rounded_rectangle(box, radius=radius, outline=(*accent, 175), width=max(8, int(H * 0.032)))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=int(H * 0.045)))

    # Base pill fill + crisp neon stroke
    card = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    card = Image.alpha_composite(card, glow_layer)
    cdraw = ImageDraw.Draw(card)

    bg_dark = (
        max(8, min(28, 10 + accent[0] // 16)),
        max(10, min(32, 13 + accent[1] // 16)),
        max(20, min(48, 24 + accent[2] // 12)),
        245,
    )
    stroke_w = max(5, int(H * 0.022))
    cdraw.rounded_rectangle(box, radius=radius, fill=bg_dark, outline=(*accent, 255), width=stroke_w)

    # Inner subtle top sheen ring
    inset = stroke_w + 4
    inner_box = [box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset]
    cdraw.rounded_rectangle(
        inner_box,
        radius=max(10, radius - inset),
        outline=(255, 255, 255, 36),
        width=2,
    )

    # Centered main text slightly above vertical center so bottom frame holds bigbullapp cleanly
    center_x = canvas_w / 2
    main_y = box[1] + pill_h * 0.43
    cdraw.text((center_x + 2, main_y + 4), label, font=font_main, fill=(0, 0, 0, 180), anchor="mm")
    cdraw.text((center_x, main_y), label, font=font_main, fill=(248, 250, 252, 255), anchor="mm")

    # Small lowercase bigbullapp pill badge embedded in bottom frame
    sig_pad_x = int(H * 0.10)
    sig_pad_y = int(H * 0.025)
    sig_h = (sig_bbox[3] - sig_bbox[1]) + sig_pad_y * 2
    sig_box_w = sig_w + sig_pad_x * 2
    sig_y_center = box[3] - stroke_w // 2
    sig_box = [
        int(center_x - sig_box_w / 2),
        int(sig_y_center - sig_h / 2),
        int(center_x + sig_box_w / 2),
        int(sig_y_center + sig_h / 2),
    ]
    cdraw.rounded_rectangle(sig_box, radius=sig_h // 2, fill=(10, 14, 28, 255), outline=(*accent, 230), width=3)
    sig_tint = (
        min(255, int(accent[0] * 0.55 + 115)),
        min(255, int(accent[1] * 0.55 + 115)),
        min(255, int(accent[2] * 0.55 + 115)),
        255,
    )
    cdraw.text((center_x, sig_y_center - 1), "bigbullapp", font=font_sig, fill=sig_tint, anchor="mm")

    final_w = round(canvas_w / SCALE)
    final_h = TARGET_HEIGHT
    out_im = card.resize((final_w, final_h), Image.Resampling.LANCZOS)
    # Lossless 256-palette RGBA quantize keeps file size small while staying razor-sharp at 203px
    out_q = out_im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    out_q.save(out_path, format="PNG", optimize=True)
    return final_w, final_h


def main() -> None:
    data = json.loads(BADGES_JSON.read_text(encoding="utf-8"))
    colors = {
        flt["id"]: _sample_accent(ICONS_DIR / f"{flt['id']}.png", flt.get("groupId", ""))
        for flt in data["filters"]
    }
    sizes = []
    for flt in data["filters"]:
        fid = flt["id"]
        label = _display_label(flt["name"])
        out_path = ICONS_DIR / f"{fid}.png"
        w, h = render_badge(label, colors[fid], out_path)
        sizes.append((fid, w, h, out_path.stat().st_size))
        flt["imageURL"] = re.sub(r"\?v=\d+$", "", flt["imageURL"]) + "?v=3"

    data["version"] = "2.1.0"
    BADGES_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total_kb = sum(s[3] for s in sizes) / 1024.0
    widths = [s[1] for s in sizes]
    print(f"Regenerated {len(sizes)} badges at height={TARGET_HEIGHT}px (width {min(widths)}..{max(widths)}px, total={total_kb:.1f} KB)")


if __name__ == "__main__":
    main()
