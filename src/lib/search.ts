import { CARDS, baseDurationC, type Card, type ColorName } from "@/data/catalog";

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
  兩: "両",
  乘: "乗",
  亂: "乱",
  龜: "亀",
  豫: "予",
  爭: "争",
  亞: "亜",
  會: "会",
  餘: "余",
  儉: "倹",
  僞: "偽",
  黨: "党",
  兒: "児",
  內: "内",
  處: "処",
  勵: "励",
  勳: "勲",
  單: "単",
  嚴: "厳",
  參: "参",
  號: "号",
  吳: "呉",
  啟: "啓",
  壓: "圧",
  鹽: "塩",
  增: "増",
  壞: "壊",
  壤: "壌",
  壯: "壮",
  聲: "声",
  賣: "売",
  奧: "奥",
  姬: "姫",
  孃: "嬢",
  寶: "宝",
  壽: "寿",
  專: "専",
  盡: "尽",
  卷: "巻",
  帶: "帯",
  彈: "弾",
  當: "当",
  從: "従",
  德: "徳",
  惠: "恵",
  惡: "悪",
  戲: "戯",
  戶: "戸",
  戾: "戻",
  拔: "抜",
  據: "拠",
  舉: "挙",
  齊: "斉",
  齋: "斎",
  斷: "断",
  舊: "旧",
  曉: "暁",
  來: "来",
  條: "条",
  櫻: "桜",
  樣: "様",
  權: "権",
  殘: "残",
  淨: "浄",
  淺: "浅",
  淚: "涙",
  濤: "涛",
  涉: "渉",
  滿: "満",
  瀧: "滝",
  潛: "潜",
  瀨: "瀬",
  燈: "灯",
  爲: "為",
  獨: "独",
  獵: "猟",
  獸: "獣",
  獻: "献",
  畫: "画",
  癡: "痴",
  盜: "盗",
  碎: "砕",
  禮: "礼",
  禪: "禅",
  稻: "稲",
  窗: "窓",
  粹: "粋",
  肅: "粛",
  續: "続",
  總: "総",
  綠: "緑",
  繩: "縄",
  膽: "胆",
  臟: "臓",
  藝: "芸",
  莊: "荘",
  藥: "薬",
  虛: "虚",
  螢: "蛍",
  蠻: "蛮",
  裝: "装",
  覺: "覚",
  觀: "観",
  說: "説",
  讓: "譲",
  豐: "豊",
  輕: "軽",
  辭: "辞",
  邊: "辺",
  鄉: "郷",
  醉: "酔",
  礦: "鉱",
  錢: "銭",
  鍊: "錬",
  關: "関",
  鬪: "闘",
  鬥: "闘",
  陷: "陥",
  險: "険",
  隱: "隠",
  雜: "雑",
  靜: "静",
  賴: "頼",
  顏: "顔",
  顯: "顕",
  髮: "髪",
  藏: "蔵",
  步: "歩",
  萬: "万",
  與: "与",
  黃: "黄",
  彌: "弥",
  辨: "弁",
  辯: "弁",
  瓣: "弁",
  辦: "弁",
  嶋: "島",
  眞: "真",
  恆: "恒",
  銳: "鋭",
  卽: "即",
  蟲: "虫",
  祕: "秘",
  兔: "兎",
  蟬: "蝉",
  蠍: "蝎",
  驗: "験",
  彥: "彦",
  俠: "侠",
  剝: "剥",
  廄: "厩",
  雙: "双",
  吞: "呑",
  咒: "呪",
  圍: "囲",
  團: "団",
  壘: "塁",
  壹: "壱",
  嶽: "岳",
  巖: "巌",
  歸: "帰",
  迴: "廻",
  貳: "弐",
  絃: "弦",
  戀: "恋",
  愼: "慎",
  懷: "懐",
  搖: "揺",
  數: "数",
  曾: "曽",
  歲: "歳",
  豬: "猪",
  瑤: "瑶",
  絲: "糸",
  繼: "継",
  繡: "繍",
  艷: "艶",
  蹟: "跡",
  踐: "践",
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
    durMin?: number;
    durMax?: number;
  },
): Card[] {
  const durOn = filters.durMin != null && filters.durMax != null && (filters.durMin > 0 || filters.durMax < 99);
  return cards.filter((c) => {
    if (filters.colors.length && !filters.colors.includes(c.color)) return false;
    if (filters.periods.length && !filters.periods.includes(c.period)) return false;
    if (filters.units.length && !filters.units.includes(c.unit)) return false;
    if (filters.rarities.length && !filters.rarities.includes(c.rarity)) return false;
    if (filters.costs.length && !filters.costs.includes(c.cost)) return false;
    if (filters.skills.length && !filters.skills.some((id) => c.skills.includes(id))) return false;
    if (filters.stratCats?.length && !filters.stratCats.some((cat) => (c.stratCats ?? []).includes(cat))) return false;
    if (durOn) {
      const dur = baseDurationC(c);
      if (dur == null || dur < filters.durMin! || dur > filters.durMax!) return false;
    }
    return true;
  });
}
