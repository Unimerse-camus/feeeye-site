#!/usr/bin/env python3
"""Render 1200x630 FeeEye Open Graph cover (2x supersampled) to assets/og-logo.png."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
S = 2
CW, CH = W * S, H * S


def find_font(bold: bool = False, size: int = 32) -> ImageFont.FreeTypeFont:
    candidates = (
        [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    )
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    for p in Path("/usr/share/fonts").rglob("*.tt[cf]"):
        name = p.name.lower()
        if "cjk" in name and (("bold" in name) == bold or not bold):
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def lerp_color(c1, c2, t: float):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    out_path = root / "assets" / "og-logo.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (CW, CH), (248, 250, 252))
    draw = ImageDraw.Draw(img)

    # Top blue-teal gradient bar (#2563eb -> #0ea5a4)
    c_blue = (37, 99, 235)
    c_teal = (14, 165, 164)
    bar_h = 8 * S
    for x in range(CW):
        col = lerp_color(c_blue, c_teal, x / max(1, CW - 1))
        draw.line([(x, 0), (x, bar_h - 1)], fill=col)

    # Fonts (2x scaled)
    f_brand = find_font(bold=True, size=34 * S)
    f_h1 = find_font(bold=True, size=50 * S)
    f_sub = find_font(bold=False, size=22 * S)
    f_pill = find_font(bold=True, size=17 * S)
    f_foot = find_font(bold=False, size=17 * S)
    f_card_hdr = find_font(bold=True, size=14 * S)
    f_row_lbl = find_font(bold=False, size=18 * S)
    f_row_val = find_font(bold=True, size=18 * S)

    lx = 64 * S

    # Eye-shaped '=' icon
    ex, ey = lx, 72 * S
    ew, eh = 56 * S, 38 * S
    draw.rounded_rectangle([ex, ey, ex + ew, ey + eh], radius=eh // 2, fill=c_blue)
    draw.arc([ex + 4 * S, ey + 4 * S, ex + ew - 4 * S, ey + eh - 4 * S], 0, 180, fill=c_teal, width=4 * S)
    bar_w, bar_th = 24 * S, 4 * S
    bx = ex + (ew - bar_w) // 2
    draw.rounded_rectangle([bx, ey + 13 * S, bx + bar_w, ey + 13 * S + bar_th], radius=2 * S, fill=(255, 255, 255))
    draw.rounded_rectangle([bx, ey + 21 * S, bx + bar_w, ey + 21 * S + bar_th], radius=2 * S, fill=(255, 255, 255))

    # Wordmark
    draw.text((ex + ew + 16 * S, ey - 2 * S), "FeeEye", font=f_brand, fill=(15, 23, 42))

    # Headline
    draw.text((lx, 152 * S), "See the fees.", font=f_h1, fill=(15, 23, 42))
    draw.text((lx, 214 * S), "Know the trade-offs.", font=f_h1, fill=(15, 23, 42))

    # Subtitle
    draw.text((lx, 298 * S), "Free, no-signup crypto fee tools & guides", font=f_sub, fill=(71, 85, 105))
    draw.text((lx, 330 * S), "across 7 major exchanges (EN / 中文)", font=f_sub, fill=(71, 85, 105))

    # 3 Blue pill tags
    pills = ["Spot Total Cost", "USDT 8-Chain Fees", "5-Chain Safety"]
    px = lx
    py = 404 * S
    for label in pills:
        bbox = draw.textbbox((0, 0), label, font=f_pill)
        tw = bbox[2] - bbox[0]
        pw = tw + 28 * S
        ph = 36 * S
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=ph // 2, fill=(239, 246, 255), outline=(191, 219, 254), width=2)
        draw.text((px + 14 * S, py + 7 * S), label, font=f_pill, fill=(29, 78, 216))
        px += pw + 12 * S

    # Footer
    draw.text((lx, 540 * S), "feeeye.com · Educational only, no signup required", font=f_foot, fill=(100, 116, 139))

    # Right benchmark card
    cx, cy = 720 * S, 84 * S
    cw, ch = 416 * S, 462 * S
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=16 * S, fill=(255, 255, 255), outline=(226, 232, 240), width=2)

    draw.text((cx + 28 * S, cy + 28 * S), "USDT WITHDRAWAL BENCHMARK", font=f_card_hdr, fill=(100, 116, 139))
    draw.line([(cx + 28 * S, cy + 58 * S), (cx + cw - 28 * S, cy + 58 * S)], fill=(241, 245, 249), width=2)

    rows = [
        ("Binance SOL", "$0.01", (5, 150, 105)),
        ("Bybit SOL", "$0.01", (5, 150, 105)),
        ("OKX SOL", "$0.05", (5, 150, 105)),
        ("Arbitrum/Base", "$0.10", (37, 99, 235)),
        ("TRC20", "$1.00", (217, 119, 6)),
        ("ERC20 Peak", "$12.00", (220, 38, 38)),
    ]
    ry = cy + 78 * S
    step_y = 60 * S
    for idx, (label, val, val_col) in enumerate(rows):
        if idx > 0:
            draw.line([(cx + 28 * S, ry - 12 * S), (cx + cw - 28 * S, ry - 12 * S)], fill=(241, 245, 249), width=2)
        draw.text((cx + 28 * S, ry + 6 * S), label, font=f_row_lbl, fill=(30, 41, 59))
        vb = draw.textbbox((0, 0), val, font=f_row_val)
        vw = vb[2] - vb[0]
        draw.text((cx + cw - 28 * S - vw, ry + 6 * S), val, font=f_row_val, fill=val_col)
        ry += step_y

    out = img.resize((W, H), Image.Resampling.LANCZOS)
    out.save(out_path, format="PNG", optimize=True)
    print(f"Saved {out_path} ({W}x{H})")


if __name__ == "__main__":
    main()
