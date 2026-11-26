#!/usr/bin/env python3
"""Render 1200x675 dark high-contrast X comparison cards using Pillow."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1200
HEIGHT = 675

ROOT_DIR = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT_DIR / "ops" / "automation" / "working" / "x-cards"

BG_COLOR = (10, 14, 23)
CARD_BG = (17, 24, 39)
BORDER_COLOR = (38, 49, 71)
TEXT_PRIMARY = (243, 244, 246)
TEXT_MUTED = (156, 163, 175)
ACCENT_GREEN = (16, 185, 129)
ACCENT_CYAN = (56, 189, 248)
ACCENT_AMBER = (245, 158, 11)
ACCENT_RED = (239, 68, 68)
BAR_TRACK = (31, 41, 55)


def find_font_path(prefer_cjk: bool = True) -> str | None:
    cjk_candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    ]
    dejavu_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    search_roots = [
        Path("/usr/share/fonts"),
        Path("/usr/local/share/fonts"),
        Path.home() / ".fonts",
        Path("/System/Library/Fonts"),
        Path("/Library/Fonts"),
    ]
    if prefer_cjk:
        for p in cjk_candidates:
            if Path(p).is_file():
                return p
        for root in search_roots:
            if root.exists():
                for match in root.rglob("*NotoSansCJK*"):
                    if match.is_file() and match.suffix.lower() in {".ttc", ".ttf", ".otf"}:
                        return str(match)
    for p in dejavu_candidates:
        if Path(p).is_file():
            return p
    for root in search_roots:
        if root.exists():
            for match in root.rglob("*DejaVuSans*"):
                if match.is_file() and match.suffix.lower() in {".ttf", ".otf"}:
                    return str(match)
    return None


def load_font(size: int, font_path: str | None) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if font_path:
        try:
            return ImageFont.truetype(font_path, size=size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_bar_card(
    out_path: Path,
    tag: str,
    title: str,
    subtitle: str,
    rows: list[tuple[str, float, str, tuple[int, int, int]]],
    max_val: float,
    callout: str,
    footer: str,
    font_path: str | None,
) -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    f_tag = load_font(20, font_path)
    f_title = load_font(36, font_path)
    f_sub = load_font(22, font_path)
    f_label = load_font(23, font_path)
    f_val = load_font(23, font_path)
    f_callout = load_font(20, font_path)
    f_footer = load_font(18, font_path)

    draw.rounded_rectangle([32, 28, WIDTH - 32, HEIGHT - 28], radius=24, fill=CARD_BG, outline=BORDER_COLOR, width=2)

    draw.text((68, 56), tag, fill=ACCENT_CYAN, font=f_tag)
    draw.text((68, 90), title, fill=TEXT_PRIMARY, font=f_title)
    draw.text((68, 144), subtitle, fill=TEXT_MUTED, font=f_sub)

    start_y = 205
    row_gap = 64 if len(rows) <= 5 and len(rows) > 3 else 88
    label_x = 68
    bar_x = 460
    bar_max_w = 500
    bar_h = 34

    for idx, (label, val, val_text, color) in enumerate(rows):
        y = start_y + idx * row_gap
        draw.text((label_x, y + 3), label, fill=TEXT_PRIMARY, font=f_label)
        draw.rounded_rectangle([bar_x, y, bar_x + bar_max_w, y + bar_h], radius=10, fill=BAR_TRACK)
        fill_w = max(18, int((val / max_val) * bar_max_w))
        draw.rounded_rectangle([bar_x, y, bar_x + fill_w, y + bar_h], radius=10, fill=color)
        draw.text((bar_x + bar_max_w + 18, y + 3), val_text, fill=color, font=f_val)

    draw.rounded_rectangle([68, HEIGHT - 134, WIDTH - 68, HEIGHT - 82], radius=12, fill=(24, 34, 54), outline=BORDER_COLOR, width=1)
    draw.text((88, HEIGHT - 120), callout, fill=ACCENT_AMBER, font=f_callout)
    draw.text((68, HEIGHT - 64), footer, fill=TEXT_MUTED, font=f_footer)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG")


def main() -> None:
    font_path = find_font_path(prefer_cjk=True)

    usdt_rows_en = [
        ("Binance / Bybit (SOL)", 0.01, "$0.01", ACCENT_GREEN),
        ("OKX (SOL)", 0.05, "$0.05", ACCENT_GREEN),
        ("Bitget (ARB / Base)", 0.15, "$0.15", ACCENT_CYAN),
        ("KuCoin (Base)", 0.60, "$0.60", ACCENT_AMBER),
        ("Kraken (ERC20)", 0.86, "$0.86", ACCENT_RED),
    ]
    usdt_rows_zh = [
        ("Binance / Bybit (SOL)", 0.01, "$0.01", ACCENT_GREEN),
        ("OKX (SOL)", 0.05, "$0.05", ACCENT_GREEN),
        ("Bitget (ARB / Base)", 0.15, "$0.15", ACCENT_CYAN),
        ("KuCoin (Base)", 0.60, "$0.60", ACCENT_AMBER),
        ("Kraken (ERC20)", 0.86, "$0.86", ACCENT_RED),
    ]

    draw_bar_card(
        OUT_DIR / "card-usdt-withdrawal-en.png",
        tag="FEEEYE BENCHMARK  |  USDT WITHDRAWAL",
        title="Cheapest USDT Withdrawal Networks vs TRC20 / ERC20",
        subtitle="Withdrawal fee per transfer across major exchanges (USD)",
        rows=usdt_rows_en,
        max_val=1.00,
        callout="Compare: TRC20 (~$1.00) & ERC20 ($1.00-$5.00+) cost up to 100x more than SOL ($0.01)",
        footer="feeeye.com  |  Live exchange withdrawal fee benchmark",
        font_path=font_path,
    )

    draw_bar_card(
        OUT_DIR / "card-usdt-withdrawal-zh.png",
        tag="FEEEYE 基准对比  |  USDT 提现手续费",
        title="主流交易所最低 USDT 提现网络 vs TRC20 / ERC20",
        subtitle="单笔提现网络手续费对比（美元计价）",
        rows=usdt_rows_zh,
        max_val=1.00,
        callout="对比参考：传统 TRC20（约 $1.00）与 ERC20（$1.00-$5.00+）最高可达 SOL（$0.01）的 100 倍",
        footer="feeeye.com  |  交易所提现费率实时基准",
        font_path=font_path,
    )

    spot_rows_en = [
        ("Binance / OKX / KuCoin / Bybit / Bitget", 1.00, "$1.00 (0.10%)", ACCENT_GREEN),
        ("Coinbase (Base Taker)", 6.00, "≤$6.00 (≤0.60%)", ACCENT_AMBER),
        ("Kraken (Base Taker)", 8.00, "$8.00 (0.80%)", ACCENT_RED),
    ]
    spot_rows_zh = [
        ("Binance / OKX / KuCoin / Bybit / Bitget", 1.00, "$1.00 (0.10%)", ACCENT_GREEN),
        ("Coinbase (基础吃单)", 6.00, "≤$6.00 (≤0.60%)", ACCENT_AMBER),
        ("Kraken (基础吃单)", 8.00, "$8.00 (0.80%)", ACCENT_RED),
    ]

    draw_bar_card(
        OUT_DIR / "card-spot-cost-en.png",
        tag="FEEEYE BENCHMARK  |  $1,000 SPOT BUY",
        title="Spot Trading Base Fee for a $1,000 Order",
        subtitle="Entry-tier spot fee comparison before VIP or token discounts",
        rows=spot_rows_en,
        max_val=8.50,
        callout="Key takeaway: Paying $8.00 on Kraken is 8x higher than $1.00 on 0.10% base-fee venues",
        footer="feeeye.com  |  Spot trading fee calculator",
        font_path=font_path,
    )

    draw_bar_card(
        OUT_DIR / "card-spot-cost-zh.png",
        tag="FEEEYE 基准对比  |  $1,000 现货买入",
        title="买入 $1,000 现货基础手续费对比",
        subtitle="未计入 VIP 或平台币折扣前的基础费率成本",
        rows=spot_rows_zh,
        max_val=8.50,
        callout="核心结论：Kraken 基础买入成本 $8.00，是 0.10% 费率交易所（$1.00）的 8 倍",
        footer="feeeye.com  |  现货交易成本计算器",
        font_path=font_path,
    )


if __name__ == "__main__":
    main()
