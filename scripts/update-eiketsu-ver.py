#!/usr/bin/env python3
"""Refresh 英傑大戦 card data for Ver.3.5.0H from official API + eiketsudb."""

from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path("/workspace")
CARDS_PATH = ROOT / "src/data/cards.json"
BASE_JSON = Path("/tmp/eiketsu-base.json")
CACHE = Path("/tmp/eiketsu-cache")
CACHE.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (compatible; eiketsu-scout/3.5.0H)"
OFFICIAL_BASE = "https://eiketsu-taisen.net/datalist/api/base"

NEW_SLUGS = {
    "EX210": "https://eiketsudb.com/card/oogami-ichirou-sakura-taisen/",
    "EX213": "https://eiketsudb.com/card/shinguuji-sakura-sakura-taisen/",
    "EX211": "https://eiketsudb.com/card/ri-kouran-sakura-taisen/",
    "EX212": "https://eiketsudb.com/card/kirishima-kanna-sakura-taisen/",
}

PATCH_NOS = [
    "蒼039", "蒼052", "蒼097", "蒼131", "蒼174", "蒼178", "PL125",
    "緋012", "緋027", "緋075", "緋080", "緋094", "緋098", "緋120", "緋122",
    "緋136", "緋153", "緋160", "緋179", "緋180", "緋182",
    "碧004", "碧015", "碧021", "碧058", "碧075", "碧103", "碧140", "碧160",
    "碧166", "碧175", "EX160", "EX204", "PL072", "PL077", "PL130",
    "玄021", "玄029", "玄057", "玄068", "玄103", "玄116", "玄123", "玄163",
    "玄184", "EX207", "PL102", "PL124",
    "紫015", "紫067", "紫078", "紫081", "紫102", "紫103", "紫121", "紫125",
    "紫138", "EX041", "EX163", "EX208", "PL097",
    "琥010", "琥013", "琥014", "琥020", "琥027", "琥046", "琥048", "琥055",
    "琥085", "琥109", "琥119", "PL088", "PL094", "PL126",
    "黄004", "黄012", "黄013", "黄014", "黄031", "黄032", "黄035", "黄049",
    "黄061", "黄069", "EX183", "EX209",
]

COLOR_NAMES = ["蒼", "緋", "碧", "玄", "紫", "琥", "黄"]
PERIOD_NAMES = ["戦国", "江戸･幕末", "三国志", "平安", "中世", "春秋戦国", "古代", "特殊"]
RARITY_NAMES = ["N", "R", "SR", "ER"]
UNIT_NAMES = ["騎兵", "槍兵", "弓兵", "剣豪", "鉄砲隊"]
COST_VALS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
STRAT_TIMES = ["知力時間", "一瞬", "撤退するまで", "固定時間"]
STRAT_CATS = [
    "強化", "全体強化", "回復", "復活", "妨害", "ダメージ", "舞い", "反計", "陣形",
    "ため計略", "渾身", "式神", "琥煌", "詠歌", "短計", "拠点", "黄熾", "旗陣形", "特殊",
]
COLOR_PREFIX = {1: "蒼", 2: "緋", 3: "碧", 4: "玄", 5: "紫", 6: "琥", 7: "黄"}
GENERAL_SCHEMA = [
    "code", "ds_code", "face_code", "name", "kana", "color_idx", "period_idx",
    "appear_num", "appear_suffix", "appear_filter_idx", "index_initial_idx",
    "card_type_idx", "card_number", "cost_idx", "rarity_idx", "unit_type_idx",
    "personal_idx", "strong", "intelligence", "skill_0", "skill_1", "skill_2",
    "strat_idx", "illust_idx", "cv_idx", "appear_pattern_idx",
]
STRAT_SCHEMA = ["code", "name", "kana", "mp", "caption", "category_idx_list", "range_idx", "time_idx"]

FW_TABLE = str.maketrans({
    "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
    "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
    "＋": "+", "－": "-", "−": "-", "．": ".", "，": ",",
    "：": ":", "％": "%", "Ｃ": "C", "ｃ": "c", "～": "~",
    "／": "/", "×": "×", "＊": "*", "　": " ",
})


def fw(s: str) -> str:
    s = s.translate(FW_TABLE)
    s = s.replace("▲", "").replace("▼", "")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n+ *", "\n", s)
    return s.strip()


def fetch(url: str, dest: Path | None = None, retries: int = 3) -> str:
    if dest and dest.exists() and dest.stat().st_size > 1000:
        return dest.read_text(errors="replace")
    last_err: Exception | None = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as res:
                data = res.read()
            if dest:
                dest.write_bytes(data)
            return data.decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.2 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last_err}")


def parse_csv_row(row: str, schema: list[str]) -> dict:
    parts = row.split(",")
    out: dict = {}
    for i, key in enumerate(schema):
        out[key] = parts[i] if i < len(parts) else None
    return out


def card_no(g: dict) -> str:
    suffix = g["appear_suffix"]
    num = int(g["card_number"])
    if suffix in ("ST", "EX", "PL"):
        return f"{suffix}{num:03d}"
    if suffix.isdigit():
        return f"{COLOR_PREFIX[int(suffix)]}{num:03d}"
    return f"{suffix}{num:03d}"


def idx_list(raw: str | None) -> list[int]:
    if not raw:
        return []
    return [int(x) for x in raw.split(":") if x != ""]


def parse_dur_fields(effects: list[dict], fallback_time: str) -> tuple[float | None, float | None, str]:
    ranked: list[tuple[int, dict]] = []
    for e in effects:
        lab, val = e["label"], e["value"]
        if not lab.startswith("効果時間"):
            continue
        if "撃破" in lab or "追加" in lab or "攻城" in lab or "短計" in lab:
            continue
        score = 10
        if "基本" in lab:
            score = 100
        elif "最大" in lab:
            score = 95
        elif "知力依存" in val:
            score = 90
        elif lab == "効果時間":
            score = 40
        ranked.append((score, e))
    ranked.sort(key=lambda x: -x[0])
    note = ""
    dur_c = None
    dep_c = None
    if ranked:
        val = ranked[0][1]["value"]
        note = val
        m = re.search(r"(\d+(?:\.\d+)?)\s*C", val)
        if m:
            dur_c = float(m.group(1))
            if dur_c.is_integer():
                dur_c = int(dur_c)
        d = re.search(r"知力依存[:：]\s*約?(\d+(?:\.\d+)?)\s*C", val)
        if d:
            dep_c = float(d.group(1))
            if dep_c.is_integer():
                dep_c = int(dep_c)
    return dur_c, dep_c, note


def parse_area_cell(cell: str) -> str:
    parts = []
    for m in re.finditer(
        r'<span class="?labelFrame"?>([\s\S]*?)</span>\s*(?:<span[^>]*>)?([^<]+)',
        cell,
    ):
        lab = fw(re.sub(r"<[^>]+>", "", m.group(1)))
        val = fw(m.group(2))
        if lab and val:
            parts.append(f"{lab} {val}")
    return " ".join(parts)


def last_version_html(table: str) -> str:
    parts = table.split('class="version"')
    if len(parts) < 2:
        return ""
    chunk = parts[-1]
    cut = re.search(r'</td>\s*<td class="area">', chunk)
    if cut:
        return chunk[: cut.start()]
    return chunk.split("</td>")[0]


def parse_version_text(version_html: str) -> list[dict]:
    html = version_html
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    html = re.sub(r"<hr\s*/?>", "\n", html, flags=re.I)
    html = re.sub(
        r'<span class="?labelFrame"?>([\s\S]*?)</span>',
        lambda m: f"\n@@{fw(re.sub(r'<[^>]+>', '', m.group(1)))}@@",
        html,
    )
    html = re.sub(r"(<div[^>]*>)\s*◆", r"\n◆", html)
    html = re.sub(r"<li[^>]*>", "\n", html)
    html = re.sub(r"<[^>]+>", "", html)
    html = fw(html)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in html.splitlines()]
    lines = [ln for ln in lines if ln and not ln.startswith("Ver.")]

    effects: list[dict] = []
    section = ""
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("◆"):
            section = ln[1:].strip()
            i += 1
            continue
        m = re.match(r"^@@(.+?)@@\s*(.*)$", ln)
        if not m:
            i += 1
            continue
        label, value = m.group(1).strip(), m.group(2).strip()
        extras: list[str] = []
        j = i + 1
        while j < len(lines) and not lines[j].startswith("@@") and not lines[j].startswith("◆"):
            extras.append(lines[j])
            j += 1
        if extras:
            value = (value + " " + " ".join(extras)).strip()
        global_lab = label.startswith("効果時間") or label in ("計略封印", "再使用間隔", "溜め時間", "兵種変化")
        if not global_lab:
            if section in ("味方", "自身", "敵") and label in (
                "武力上昇", "知力上昇", "速度上昇", "兵力回復", "武力低下", "知力低下",
                "武力ダメージ軽減", "兵種変化",
            ):
                label = f"{label}({section})"
            elif section.startswith("短計"):
                pass
            elif section and section not in ("味方", "自身", "敵"):
                if not value:
                    value = section
                elif section not in value:
                    value = f"{section} {value}"
        effects.append({"label": label, "value": value})
        if global_lab:
            section = ""
        i = j

    folded: list[dict] = []
    k = 0
    while k < len(effects):
        cur = effects[k]
        if (
            k + 1 < len(effects)
            and not cur["label"].startswith("効果時間")
            and effects[k + 1]["label"] == "効果時間"
            and k + 2 < len(effects)
            and effects[k + 2]["label"].startswith("効果時間")
        ):
            nested = effects[k + 1]["value"]
            folded.append({
                "label": cur["label"],
                "value": (cur["value"] + f"（{nested}）") if cur["value"] else nested,
            })
            k += 2
            continue
        folded.append(cur)
        k += 1
    return folded


def parse_card_page(html: str, fallback_time: str) -> dict:
    m = re.search(r'<table[^>]*keiryakudata[\s\S]*?</table>', html)
    if not m:
        return {"effects": [], "durC": None, "depC": None, "durNote": "", "area": ""}
    table = m.group(0)
    version_html = last_version_html(table)
    effects = parse_version_text(version_html) if version_html else []
    dur_c, dep_c, note = parse_dur_fields(effects, fallback_time)
    areas = re.findall(r'<td class="area">([\s\S]*?)</td>', table)
    area = parse_area_cell(areas[-1]) if areas else ""
    return {
        "effects": effects,
        "durC": dur_c,
        "depC": dep_c,
        "durNote": note,
        "area": area,
    }


def load_official() -> tuple[list[dict], list[dict]]:
    raw = json.loads(fetch(OFFICIAL_BASE, BASE_JSON))
    generals = [parse_csv_row(r, GENERAL_SCHEMA) for r in raw["general"]]
    strats = [parse_csv_row(r, STRAT_SCHEMA) for r in raw["strat"]]
    return generals, strats


def official_to_card(g: dict, strats: list[dict], scraped: dict, db_url: str) -> dict:
    strat = strats[int(g["strat_idx"])]
    skills = [int(g[k]) for k in ("skill_0", "skill_1", "skill_2") if int(g[k]) >= 0]
    cats = [STRAT_CATS[i] for i in idx_list(strat["category_idx_list"]) if i < len(STRAT_CATS)]
    time_idx = int(strat["time_idx"])
    strat_time = STRAT_TIMES[time_idx] if 0 <= time_idx < len(STRAT_TIMES) else "知力時間"
    mp_raw = str(strat["mp"]).split(":")[0]
    return {
        "id": g["code"],
        "no": card_no(g),
        "name": g["name"].replace(" ", "").replace("　", ""),
        "kana": g["kana"].replace(" ", ""),
        "color": COLOR_NAMES[int(g["color_idx"])],
        "period": PERIOD_NAMES[int(g["period_idx"])],
        "cost": COST_VALS[int(g["cost_idx"])],
        "rarity": RARITY_NAMES[int(g["rarity_idx"])],
        "unit": UNIT_NAMES[int(g["unit_type_idx"])],
        "power": int(g["strong"]),
        "intel": int(g["intelligence"]),
        "skills": skills,
        "stratName": strat["name"],
        "stratKana": strat["kana"],
        "stratCost": int(float(mp_raw)),
        "stratDesc": strat["caption"].replace("\n", "<br>"),
        "stratCats": cats,
        "stratTime": strat_time,
        "durC": scraped.get("durC"),
        "depC": scraped.get("depC"),
        "durNote": scraped.get("durNote") or "",
        "effects": scraped.get("effects") or [],
        "area": scraped.get("area") or "",
        "dbUrl": db_url,
    }


def apply_scraped(card: dict, scraped: dict) -> dict:
    out = dict(card)
    if scraped.get("effects"):
        out["effects"] = scraped["effects"]
    if scraped.get("durNote"):
        out["durC"] = scraped["durC"]
        out["depC"] = scraped["depC"]
        out["durNote"] = scraped["durNote"]
    if "area" in scraped:
        # keep previous if new area empty (image-only pages)
        if scraped["area"]:
            out["area"] = scraped["area"]
    return out


def main() -> None:
    payload = json.loads(CARDS_PATH.read_text())
    cards: list[dict] = payload["cards"]
    by_no: dict[str, list[dict]] = {}
    for c in cards:
        by_no.setdefault(c["no"], []).append(c)

    generals, strats = load_official()
    gen_by_no = {card_no(g): g for g in generals}
    print("official generals", len(generals), "local", len(cards))

    urls: dict[str, str] = {}
    for no in PATCH_NOS:
        if no not in by_no:
            print("MISSING local", no)
            continue
        urls[no] = by_no[no][0]["dbUrl"]
    urls.update(NEW_SLUGS)

    scraped_by_url: dict[str, dict] = {}
    for no, url in urls.items():
        slug = url.rstrip("/").split("/")[-1]
        dest = CACHE / f"{slug}.html"
        html = fetch(url, dest)
        fallback = by_no[no][0]["stratTime"] if no in by_no else "知力時間"
        scraped_by_url[url] = parse_card_page(html, fallback)

    patched = 0
    by_id = {c["id"]: i for i, c in enumerate(cards)}
    for no in PATCH_NOS:
        for card in by_no.get(no, []):
            sc = scraped_by_url.get(card["dbUrl"])
            if not sc:
                print("no scrape", no)
                continue
            cards[by_id[card["id"]]] = apply_scraped(card, sc)
            patched += 1

    existing_ids = {c["id"] for c in cards}
    new_cards = []
    for no, url in NEW_SLUGS.items():
        g = gen_by_no[no]
        sc = scraped_by_url[url]
        card = official_to_card(g, strats, sc, url)
        if not card["area"] and "自身" in (card["stratDesc"] or "") and "味方" not in card["stratDesc"][:20]:
            pass
        if card["no"] == "EX212" and not card["area"]:
            card["area"] = "自身"
        new_cards.append(card)
        print(f"NEW {card['no']} {card['name']} dur={card['durC']} area={card['area']!r}")
        for e in card["effects"]:
            print("   ", e)

    color_order = {c: i for i, c in enumerate(COLOR_NAMES)}
    for nc in new_cards:
        if nc["id"] in existing_ids:
            # refresh in place
            cards[by_id[nc["id"]]] = nc
            print("refreshed", nc["no"])
            continue
        insert_at = len(cards)
        for i, c in enumerate(cards):
            if color_order[c["color"]] > color_order[nc["color"]]:
                insert_at = i
                break
        cards.insert(insert_at, nc)
        print("inserted", nc["no"], "at", insert_at)

    # sanity print of previously-bad cards
    check = {c["no"]: c for c in cards}
    for no in ["玄029", "玄123", "黄012", "EX211", "緋012", "蒼097", "PL125"]:
        c = check[no]
        print(f"CHK {c['no']} {c['name']} dur={c['durC']} note={c['durNote']!r} area={c['area']!r} nfx={len(c['effects'])}")

    out = {"count": len(cards), "cards": cards}
    CARDS_PATH.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("wrote count", len(cards), "patched", patched)


if __name__ == "__main__":
    main()
