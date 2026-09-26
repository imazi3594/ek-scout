import { CARDS, type Card, type ColorName } from "@/data/catalog";

const VARIANT: Record<string, string> = {
  戰: "戦",
  國: "国",
  驅: "駆",
  氣: "気",
  靈: "霊",
  劍: "剣",
  擊: "撃",
  傳: "伝",
  龍: "竜",
  濱: "浜",
  澤: "沢",
  廣: "広",
  樂: "楽",
  縣: "県",
  對: "対",
  發: "発",
  經: "経",
  營: "営",
  鐵: "鉄",
  驛: "駅",
  圖: "図",
  轉: "転",
  變: "変",
  實: "実",
  榮: "栄",
  學: "学",
  圓: "円",
  黑: "黒",
  冰: "氷",
  霸: "覇",
  將: "将",
  裡: "裏",
  臺: "台",
  體: "体",
};

const PREFIX = "ST|EX|PL|蒼|緋|碧|玄|紫|琥|黄";

export function fold(input: string): string {
  let s = input.normalize("NFKC").toLowerCase();
  s = s.replace(/[\s　・･.\-_/／]/g, "");
  let out = "";
  for (const ch of s) out += VARIANT[ch] ?? ch;
  return out;
}

function paddedNo(rawNo: string): string | null {
  const m = rawNo.match(new RegExp(`^(${PREFIX})(\\d{1,3})$`, "i"));
  if (!m) return null;
  return `${m[1]}${m[2].padStart(3, "0")}`;
}

type Indexed = {
  card: Card;
  foldName: string;
  foldKana: string;
  foldStrat: string;
  foldStratKana: string;
  foldNo: string;
};

const INDEX: Indexed[] = CARDS.map((card) => {
  const foldName = fold(card.name);
  const foldKana = fold(card.kana);
  const foldStrat = fold(card.stratName);
  const foldStratKana = fold(card.stratKana);
  const foldNo = fold(card.no);
  return { card, foldName, foldKana, foldStrat, foldStratKana, foldNo };
});

export type SearchHit = { card: Card; score: number };

export function searchCards(query: string, limit = 60): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const f = fold(q);
  if (!f) return [];
  const exactNo = paddedNo(q.replace(/[\s　]/g, "")) ?? paddedNo(f);

  const hits: SearchHit[] = [];
  for (const row of INDEX) {
    let score = 0;
    if (exactNo && row.card.no === exactNo) score = 1000;
    else if (row.foldNo === f) score = 900;
    else if (row.foldName === f) score = 800;
    else if (row.foldName.startsWith(f)) score = 700;
    else if (row.foldKana === f || row.foldKana.startsWith(f)) score = 650;
    else if (row.foldStrat === f || row.foldStrat.startsWith(f)) score = 600;
    else if (row.foldNo.includes(f)) score = 500;
    else if (row.foldName.includes(f)) score = 400;
    else if (row.foldKana.includes(f)) score = 360;
    else if (row.foldStrat.includes(f) || row.foldStratKana.includes(f)) score = 300;
    if (score > 0) hits.push({ card: row.card, score });
  }

  hits.sort((a, b) => b.score - a.score || a.card.no.localeCompare(b.card.no, "ja"));
  return hits.slice(0, limit);
}

export function filterCards(
  cards: Card[],
  filters: {
    colors: ColorName[];
    periods: string[];
    units: string[];
    skills: number[];
    rarities: string[];
    costs: number[];
    stratCats?: string[];
  },
): Card[] {
  return cards.filter((c) => {
    if (filters.colors.length && !filters.colors.includes(c.color)) return false;
    if (filters.periods.length && !filters.periods.includes(c.period)) return false;
    if (filters.units.length && !filters.units.includes(c.unit)) return false;
    if (filters.rarities.length && !filters.rarities.includes(c.rarity)) return false;
    if (filters.costs.length && !filters.costs.includes(c.cost)) return false;
    if (filters.skills.length && !filters.skills.some((id) => c.skills.includes(id))) return false;
    if (filters.stratCats?.length && !filters.stratCats.some((cat) => (c.stratCats ?? []).includes(cat))) return false;
    return true;
  });
}
