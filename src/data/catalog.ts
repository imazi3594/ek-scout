import raw from "./cards.json";
import { isDurationEffectLabel, translateArea, translateCat, translateDesc, translateLabel, translateValue } from "./translate";

export type Rarity = "N" | "R" | "SR" | "ER";
export type ColorName = "蒼" | "緋" | "碧" | "玄" | "紫" | "琥" | "黄";
export type UnitName = "騎兵" | "槍兵" | "弓兵" | "剣豪" | "鉄砲隊";
export type StratTime = "知力時間" | "一瞬" | "撤退するまで" | "固定時間";

export type CardEffect = { label: string; value: string };

export type Card = {
  id: string;
  no: string;
  name: string;
  kana: string;
  color: ColorName;
  period: string;
  cost: number;
  rarity: Rarity;
  unit: UnitName;
  power: number;
  intel: number;
  skills: number[];
  stratName: string;
  stratKana: string;
  stratCost: number;
  stratDesc: string;
  stratCats: string[];
  stratTime: string;
  durC: number | null;
  depC: number | null;
  durNote: string;
  effects: CardEffect[];
  area: string;
  dbUrl: string;
};

export type StatLine = { label: string; value: string };

const STAT_VALUE = String.raw`[+\-＋－約]\S+|\d+(?:\.\d+)?秒ごと\S+`;
const UNIT_KEY = "騎兵|槍兵|弓兵|剣豪|鉄砲隊";

/** Break cramped scale tables (黃熾槽／兵力／成本…) into one line per tier. */
export function splitEffectValue(value: string): { note: string; lines: string[] } {
  const intelBands = splitIntelBands(value);
  if (intelBands) return intelBands;

  let s = value.replace(/[^\S\n]+/g, " ").trim();
  if (!s) return { note: "", lines: [] };

  let prefixNote = "";
  const intelNote = s.match(/^[（(]知力依存[^）)]*[）)]\s*/);
  if (intelNote) {
    const raw = intelNote[0].trim();
    prefixNote = /無|なし|なし/.test(raw) ? "" : raw;
    s = s.slice(intelNote[0].length).trim();
  }

  let text = s.replace(new RegExp(String.raw`(${STAT_VALUE})\s+(?=\S[^:]{0,48}:\s*(?:${STAT_VALUE}))`, "g"), "$1\n");
  if ((s.match(new RegExp(`(?:${UNIT_KEY}):`, "g")) ?? []).length >= 2) {
    text = text.replace(new RegExp(String.raw`(?<=\S)\s+(?=(?:${UNIT_KEY})\s*:)`, "g"), "\n");
  }

  let lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { note: prefixNote, lines: s ? [s] : [] };
  }

  const lead = lines[0].match(new RegExp(String.raw`^(.*?)\s+(\S[^:]*:\s*(?:${STAT_VALUE}))$`));
  if (lead?.[1]?.trim()) {
    const maybeNote = lead[1].trim();
    const maybeFirst = lead[2].trim();
    const next = lines[1] ?? "";
    const falsePeel = next.startsWith(maybeNote) && !maybeFirst.startsWith(maybeNote);
    if (!falsePeel) {
      lines = [maybeNote, maybeFirst, ...lines.slice(1)];
    }
  }

  const joinNote = (note: string) => [prefixNote, note].filter(Boolean).join(" ");
  if (!/[:：]/.test(lines[0])) {
    return { note: joinNote(lines[0]), lines: lines.slice(1).map(tidyPair) };
  }
  return { note: prefixNote, lines: lines.map(tidyPair) };
}

function tidyPair(line: string): string {
  return line.replace(/\s*:\s*/, " : ").replace(/\s+/g, " ").trim();
}

/** 知力2~3的敵-3 知力4~5的敵-4 … → one line per enemy-intel band. */
function splitIntelBands(value: string): { note: string; lines: string[] } | null {
  const re = /知力\s*(\d+)\s*[~～〜]\s*(\d+)\s*的敵\s*([+\-＋－]?\d+)/g;
  const lines: string[] = [];
  for (const match of value.matchAll(re)) {
    const raw = match[3].replace("＋", "+").replace("－", "-");
    const n = raw.replace(/^[+\-]/, "");
    const sign = raw.startsWith("+") ? "+" : "−";
    lines.push(`敵知力 ${match[1]}–${match[2]}：${sign}${n}`);
  }
  if (lines.length < 2) return null;
  re.lastIndex = 0;
  const rest = value.replace(re, "").replace(/\s+/g, "").trim();
  if (rest) return null;
  return { note: "", lines };
}

export type KonshinTierId = "strong" | "weak" | "none";

export type KonshinTier = {
  id: KonshinTierId;
  title: string;
  morale: string;
  rows: StatLine[];
};

export type ShukuseiTier = {
  id: "star" | "normal";
  title: string;
  morale: number;
  rows: StatLine[];
};


export type SkillDef = {
  id: number;
  name: string;
  short: string;
  official: string;
  detail: string;
  playTip: string;
  kind: "open" | "combat" | "move" | "gauge";
  facts: StatLine[];
  durationC?: string;
};

export type StratDuration = {
  compact: string;
  label: string;
  seconds: string;
  dep: string;
  extra: string;
  hint: string;
  cap: boolean;
};

export const COLORS: ColorName[] = ["蒼", "緋", "碧", "玄", "紫", "琥", "黄"];
export const UNITS: UnitName[] = ["騎兵", "槍兵", "弓兵", "剣豪", "鉄砲隊"];
export const PERIODS = ["戦国", "江戸･幕末", "三国志", "平安", "中世", "春秋戦国", "古代", "特殊"];
export const PERIOD_LABEL: Record<string, string> = {
  戦国: "戰國",
  "江戸･幕末": "江戶・幕末",
  三国志: "三國志",
  平安: "平安",
  中世: "中世",
  春秋戦国: "春秋戰國",
  古代: "古代",
  特殊: "特殊",
};
export const RARITIES: Rarity[] = ["N", "R", "SR", "ER"];
export const RARITY_CLASS: Record<Rarity, string> = {
  N: "text-muted",
  R: "text-rarity-r",
  SR: "text-cost",
  ER: "rarity-er",
};
export const RARITY_CHIP: Record<Rarity, { idle: string; active: string }> = {
  N: {
    idle: "bg-muted/70 font-bold text-bg",
    active: "bg-muted font-bold text-bg ring-2 ring-inset ring-fg",
  },
  R: {
    idle: "bg-rarity-r/70 font-bold text-bg",
    active: "bg-rarity-r font-bold text-bg ring-2 ring-inset ring-fg",
  },
  SR: {
    idle: "bg-cost/70 font-bold text-black",
    active: "bg-cost font-bold text-black ring-2 ring-inset ring-fg",
  },
  ER: {
    idle: "rarity-er-chip font-bold",
    active: "rarity-er-chip font-bold ring-2 ring-inset ring-fg",
  },
};
export const COSTS = [1, 1.5, 2, 2.5, 3, 3.5, 4];

/** 計略類型。順序：基本強化／妨害 → 陣形節奏 → 特殊。 */
export const STRAT_CATS = [
  "強化",
  "全体強化",
  "回復",
  "妨害",
  "ダメージ",
  "復活",
  "陣形",
  "旗陣形",
  "ため計略",
  "渾身",
  "琥煌",
  "黄熾",
  "短計",
  "舞い",
  "反計",
  "式神",
  "詠歌",
  "拠点",
  "特殊",
] as const;

export const UNIT_SHORT: Record<UnitName, string> = {
  騎兵: "騎",
  槍兵: "槍",
  弓兵: "弓",
  剣豪: "剣",
  鉄砲隊: "砲",
};

export const COLOR_CLASS: Record<ColorName, string> = {
  蒼: "bg-faction-ao text-white",
  緋: "bg-faction-hi text-white",
  碧: "bg-faction-heki text-white",
  玄: "bg-faction-gen text-white",
  紫: "bg-faction-shi text-white",
  琥: "bg-faction-ko text-accent-fg",
  黄: "bg-faction-ou text-accent-fg",
};

export const COLOR_INK: Record<ColorName, string> = {
  蒼: "text-faction-ao",
  緋: "text-faction-hi",
  碧: "text-faction-heki",
  玄: "text-fg",
  紫: "text-faction-shi",
  琥: "text-faction-ko",
  黄: "text-faction-ou",
};

export const COLOR_BAR: Record<ColorName, string> = {
  蒼: "bg-faction-ao",
  緋: "bg-faction-hi",
  碧: "bg-faction-heki",
  玄: "bg-faction-gen",
  紫: "bg-faction-shi",
  琥: "bg-faction-ko",
  黄: "bg-faction-ou",
};

/** 1 カウント ＝ 2.4 秒。全場由 99C 數到 00。 */
export const COUNT_SECONDS = 2.4;
export const MATCH_COUNTS = 99;

export const SKILLS: SkillDef[] = [
  {
    id: 0,
    name: "伏兵",
    short: "伏",
    official: "敵軍視点から視認されない伏兵状態で開戦します。敵部隊と接触すると知力差によるダメージを与え、伏兵状態は解除されます。",
    detail:
      "開場以伏兵狀態登場，敵軍無法看見，移速大幅下降，且無法攻擊。接觸敵部隊時依知力差造成傷害，其後解除。伏兵期間幾乎不受戰鬥傷害，弓與斬擊通常無法命中。但被傷害計略命中、撞上柵或櫓、進入攻城區、歸城，或自身發動計略，都會解除。",
    playTip: "對戰時先估計對手知力。高知力伏兵是開場爆發。霸氣槽無故跳動，往往代表附近有伏兵。",
    kind: "open",
    facts: [
      { label: "傷害", value: "30 × (己知力 ÷ 敵知力) ＋ 10" },
      { label: "同知力", value: "約 40%" },
      { label: "固定部份", value: "約 10%" },
    ],
  },
  {
    id: 1,
    name: "防柵",
    short: "柵",
    official: "敵部隊の動きを阻害する障害物「柵」を部隊前方に配置した状態で開戦します。",
    detail:
      "開場在部隊前方設置柵，阻擋敵軍移動。每持有一個防柵即設置一道。柵被敵部隊撞擊達一定次數後破壞。不阻擋己方。亦可阻擋鐵砲射擊（達到次數仍會破壞），貫通射擊仍然有效。",
    playTip: "用以擋路、保護弓與鐵砲、拖延攻城。見到防柵應改道，或用傷害計略清除。",
    kind: "open",
    facts: [{ label: "放置", value: "每 1 個防柵＝前方 1 道柵" }],
  },
  {
    id: 2,
    name: "復活",
    short: "活",
    official: "撤退した際、復活するために必要な時間が減少します。",
    detail: "只縮短此卡自身的復活等待。",
    playTip: "持有兩個或三個復活的武將，自身重新上場較快。擊破後應趁其尚未復活時攻城，或轉換進攻點。",
    kind: "combat",
    facts: [
      { label: "基本復活", value: "30 秒（12.5C）" },
      { label: "1 個", value: "−4 秒 → 26 秒（約 10.8C）" },
      { label: "2 個", value: "−7 秒 → 23 秒（約 9.6C）" },
      { label: "3 個", value: "−9 秒 → 21 秒（約 8.8C）" },
    ],
    durationC: "此卡 −4／−7／−9 秒",
  },
  {
    id: 3,
    name: "忍",
    short: "忍",
    official: "敵軍視点から視認されない隠密状態になります。ただし敵部隊または敵城に近づくと隠密状態は解除されます。",
    detail:
      "遠離敵部隊或敵城時進入隠密，敵軍無法看見，亦看不見出城煙。靠近約 1.5 張卡距離、進入敵城第一格、撞上柵或櫓、被傷害計略命中、被兵種動作命中，都會解除。離開後過一段時間會再次隠密。弓通常無法鎖定隠密目標。突擊氣場、槍氣場、出入城特效都會隱藏。",
    playTip: "是側襲、繞後、偷攻城的訊號。可從霸氣槽異常跳動，或突然現形的位置捕捉。",
    kind: "move",
    facts: [{ label: "現形距離", value: "約 1.5 張卡距離／敵城第一格" }],
  },
  {
    id: 4,
    name: "気合",
    short: "気",
    official: "通常の戦闘で受けたダメージの一部を一定時間ごとに回復します。",
    detail:
      "受到的一般戰鬥傷害，有一部分以紅色兵力顯示，並隨時間回復。弓攻擊期間，氣合回復不會發動。伏兵的知力傷害與計略減兵不會轉成紅槽。超過 100% 兵力的部分亦不回復。",
    playTip: "不宜以消耗兵力對付氣合槍兵或騎兵，應一次擊破，或改用計略傷害。以弓壓制可停止其回復。",
    kind: "combat",
    facts: [
      { label: "可回復比例", value: "一般戰鬥傷害的 15%" },
      { label: "回復節奏", value: "每 2.0 秒（約 0.8C）回 1.5%" },
    ],
    durationC: "回復間隔 0.8C",
  },
  {
    id: 5,
    name: "狙撃",
    short: "狙",
    official: "同じ射撃対象を一定時間ロックオンし続けることで、コストに応じてより強力な射撃を行える狙撃状態になります。",
    detail:
      "鐵砲隊專用。持續鎖定同一目標後，照準由藍變黃，進入狙撃。狙撃傷害更高，命中會擊退，使目標瞬間無法歸城，並解除騎兵的突擊準備。效果隨成本上升。",
    playTip: "被鎖定時應立刻側移、進入掩體，或以前排抵擋。高成本狙撃的傷害很高。",
    kind: "combat",
    facts: [
      { label: "鎖定時間", value: "2 秒（約 0.8C）" },
      { label: "追加傷害", value: "成本愈高愈強；2.5 Cost 時每擊約 +0.5%" },
    ],
    durationC: "鎖定 0.8C",
  },
  {
    id: 6,
    name: "昂揚",
    short: "昂",
    official: "コストに応じて士気が増加した状態で開戦します。",
    detail:
      "開場即加士氣。持有昂揚的武將成本每 0.5 Cost，士氣 ＋0.1（合計 5.0 Cost ＝ 士氣 1）。同一張卡有兩個昂揚會再倍增。",
    playTip: "把對手昂揚成本加總 ×0.2，即為額外的開場士氣。高昂揚卡組會搶得先手計略。",
    kind: "open",
    facts: [
      { label: "公式", value: "士氣 ＋（昂揚成本合計 × 0.2）" },
      { label: "1.0 Cost", value: "＋0.2 士氣" },
      { label: "2.0 Cost", value: "＋0.4 士氣" },
      { label: "2.5 Cost", value: "＋0.5 士氣" },
      { label: "3.0 Cost", value: "＋0.6 士氣" },
      { label: "3.5 Cost", value: "＋0.7 士氣" },
    ],
  },
  {
    id: 7,
    name: "技巧",
    short: "技",
    official: "コストに応じて流派ゲージが増加した状態で開戦します。",
    detail:
      "開場增加流派槽。持有技巧的武將成本每 0.5 Cost，流派槽 ＋1/60（合計 5.0 Cost ＝ 整條槽的 1/6）。",
    playTip: "技巧多的卡組中期會突然變強。盡早打斷其流派節奏。",
    kind: "open",
    facts: [
      { label: "公式", value: "槽 ＋（技巧成本合計 ÷ 30）條" },
      { label: "1.5 Cost", value: "約 5.0%" },
      { label: "2.5 Cost", value: "約 8.3%" },
      { label: "5.0 Cost", value: "約 16.7%（1/6 條）" },
    ],
  },
  {
    id: 8,
    name: "先陣",
    short: "先",
    official: "開戦から一定時間、武力と知力が上がります。",
    detail:
      "開場期間武力、知力各 ＋1。由 99C 倒數至 50C 為止（約開頭 49C）。持有多個先陣會再疊加。",
    playTip: "開場不宜與先陣隊正面硬拚。等加成結束再交戰，或用妨害拖延時間。",
    kind: "open",
    facts: [
      { label: "持續", value: "99C → 50C（約 49C／118 秒）" },
      { label: "加成", value: "武力 ＋1、知力 ＋1（可疊）" },
    ],
    durationC: "約 49C（99→50）",
  },
  {
    id: 9,
    name: "鬼",
    short: "鬼",
    official: "兵力が一定以下になると、兵種アクションによるダメージと弾き効果を軽減します。",
    detail:
      "兵力降至約 40% 以下後，兵種動作（突擊、槍擊、斬擊、射擊等）的傷害與彈開距離會減輕。亂戰與計略傷害不減。兵力回升後解除。發動時，名牌右上圖示會變亮。",
    playTip: "鬼武將殘血時很耐打。宜用計略傷害或知力傷害收尾，不要只靠兵種動作消耗。",
    kind: "combat",
    facts: [
      { label: "發動", value: "兵力約 40% 以下" },
      { label: "傷害", value: "兵種動作傷害約變成 2/3" },
      { label: "彈開", value: "彈開距離約變成 1/3" },
    ],
  },
  {
    id: 10,
    name: "疾駆",
    short: "疾",
    official: "兵種に応じて移動速度が上がります。",
    detail: "依兵種提高移動速度。騎兵加幅較小，其他兵種較明顯。",
    playTip: "應預判疾驅的走位，用柵、槍線或範圍計略攔截，不要沿直線追擊。",
    kind: "move",
    facts: [
      { label: "騎兵", value: "移速 ＋約 5%" },
      { label: "其他兵種", value: "移速 ＋約 10%" },
    ],
  },
  {
    id: 11,
    name: "大兵",
    short: "兵",
    official: "特技「大兵」を持つ武将と同じ時代の武将コスト合計に応じて最大兵力が上がります。",
    detail:
      "與持有「大兵」的武將同一時代，登錄成本愈高，最大兵力愈高。同時代集中的卡組，兵力會特別高。",
    playTip: "看對手時代是否集中。同時代大兵隊要用範圍傷害或計略處理。",
    kind: "open",
    facts: [
      { label: "合計 1.0 Cost", value: "最大兵力 ＋約 5%" },
      { label: "合計 2.0 Cost", value: "＋約 10%" },
      { label: "合計 4.0 Cost", value: "＋約 15%" },
      { label: "合計 9.0 Cost", value: "＋約 30%" },
    ],
  },
  {
    id: 12,
    name: "同盟",
    short: "盟",
    official: "最大士気が増加した状態で開戦します。ただし１５より多くならない。",
    detail: "開場提高最大士氣上限。每 1 個同盟 ＋1，不會超過 15。",
    playTip: "同盟代表後期的大型計略威脅。前期要壓住節奏，不要讓對方把士氣槽存滿。",
    kind: "open",
    facts: [{ label: "最大士氣", value: "每個同盟 ＋1（上限 15）" }],
  },
  {
    id: 13,
    name: "槍術",
    short: "槍",
    official: "コストに応じて槍が長くなり、槍撃ダメージが上がります。",
    detail:
      "槍兵特技。成本愈高，槍愈長，槍擊傷害愈高。高成本槍術能在接觸前擊中敵軍。",
    playTip: "不要正面衝向槍線。應側繞，或以伏兵、遠程處理。",
    kind: "combat",
    facts: [
      { label: "1.0 Cost 槍擊", value: "＋約 0.6%" },
      { label: "1.5 Cost", value: "＋約 0.8%" },
      { label: "2.0 Cost", value: "＋約 1.0%" },
      { label: "2.5 Cost", value: "＋約 1.2%" },
      { label: "3.0 Cost", value: "＋約 1.4%" },
      { label: "3.5 Cost", value: "槍擊 ＋約 1.6%　槍長 ＋約 45%" },
    ],
  },
  {
    id: 14,
    name: "黄熾",
    short: "黄",
    official: "黄熾ゲージが一定以上になると、武力と知力が上がります。黄熾ゲージは覇道の前進により増加し、時間経過で減少します。",
    detail:
      "黃勢特有的節奏。霸道前進與專用計略會增加黃熾槽，並隨時間下降。槽達約 1/3（黃色）時，武力與知力上升。拖慢對方霸道，即可壓制這套效果。",
    playTip: "黃熾隊會搶推霸道。中途卡住霸道，就能削減其數值加成。",
    kind: "gauge",
    facts: [
      { label: "發動", value: "黃熾槽約 1/3 以上　武＋2 知＋2" },
      { label: "自然衰減", value: "每 1.3C −2.5%" },
    ],
    durationC: "衰減節奏 1.3C",
  },
  {
    id: 15,
    name: "覇気",
    short: "覇",
    official: "武将コストに応じて覇気が溜まる量が増え、特技「覇気」を持つ武将の武将コスト合計に応じて英傑呼応のダメージが上がります。",
    detail: "加快霸氣累積，並依「覇気」持有武將成本合計提高英傑呼應（攻城呼應）傷害。推城威脅明顯。",
    playTip: "覇氣愈多，對城的傷害愈高。應擋住霸道、清除前排，或利用復活時間差交換攻城。",
    kind: "gauge",
    facts: [
      { label: "霸氣累積", value: "約 1.3 倍" },
      { label: "呼應傷害", value: "合計 1 Cost ＋0.3%　2 Cost ＋0.6%　3 Cost ＋0.9%　6 Cost ＋1.8%" },
    ],
  },
  {
    id: 16,
    name: "宿星",
    short: "星",
    official: "宿星ゲージが一定以上になると、武力と知力が上がります。宿星ゲージは与えたダメージに応じて増加します。",
    detail:
      "造成傷害會增加宿星槽。槽達 100% 以上時武力與知力各 ＋1，達 200%（宿星狀態）時各 ＋2。攻勢順利時，優勢會愈滾愈大。",
    playTip: "不要與宿星隊互相消耗。宜用妨害、拉開距離，並集中火力迅速擊破其主力。",
    kind: "gauge",
    facts: [
      { label: "槽增加", value: "造成傷害的 60%" },
      { label: "200% 所需", value: "累積傷害約等於兵力 333%" },
      { label: "100% / 200%", value: "武知 ＋1 / ＋2" },
    ],
  },
  {
    id: 17,
    name: "霊力",
    short: "霊",
    official: "特技「霊力」を持つ武将の武将コスト合計に応じて最大兵力が上がります。",
    detail:
      "持有「靈力」的武將，成本合計愈高，最大兵力愈高。此為『櫻花大戰』卡組的核心特技，與時代無關。",
    playTip: "靈力隊的兵力會特別高。合計 2.5 Cost 約 ＋10%，7.5 Cost（前半四張齊集）約 ＋25%。宜用範圍傷害或計略處理。",
    kind: "open",
    facts: [
      { label: "公式", value: "最大兵力 ＋（靈力成本合計 × 約 4%）" },
      { label: "合計 2.5 Cost", value: "＋約 10%" },
      { label: "合計 7.5 Cost", value: "＋約 25%" },
    ],
  },
];

const payload = raw as { count: number; cards: Card[] };
export const CARDS: Card[] = payload.cards;
export const CARD_COUNT = payload.count;

/** 資料對應的遊戲版與擷取日，下次 scrape 記得改。 */
export const DATA_META = {
  gameVer: "3.5.0H",
  pack: "第６彈 古幻相剋の八象　『サクラ大戦』コラボ前半",
  gameDate: "2026-09-16",
  dataDate: "2026-09-18",
} as const;

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function skillById(id: number): SkillDef {
  return SKILLS[id] ?? SKILLS[0];
}

export function thumbUrl(card: Card): string {
  return `https://image.eiketsu-taisen.net/general/card_small/${card.id}.jpg`;
}

export function officialUrl(card: Card): string {
  return `https://eiketsu-taisen.net/datalist/?s=general&c=${card.id}`;
}

export function formatCost(n: number): string {
  return n.toFixed(1);
}

/** 武將成本。寫 Cost 以免與時間單位 C（1C＝2.4 秒）混淆。 */
export function costLabel(n: number): string {
  return `${formatCost(n)} Cost`;
}

export function formatCount(c: number): string {
  const n = Math.round(c * 10) / 10;
  return Number.isInteger(n) ? `${n}C` : `${n.toFixed(1)}C`;
}

export function countToSeconds(c: number): number {
  return Math.round(c * COUNT_SECONDS * 10) / 10;
}

export function ambushDamage(selfIntel: number, enemyIntel: number): number {
  if (enemyIntel <= 0) return 30 * selfIntel + 10;
  return Math.round((30 * (selfIntel / enemyIntel) + 10) * 10) / 10;
}

export function koageFromCost(cost: number): number {
  return Math.round(cost * 0.2 * 10) / 10;
}

export function gikouFromCost(cost: number): number {
  return Math.round((cost / 30) * 1000) / 10;
}

/** 槍術槍擊傷害加成（%）。1.0 Cost→0.6，之後每 0.5 Cost ＋0.2。 */
export function spearDamageBonus(cost: number): number {
  return Math.round((0.2 + cost * 0.4) * 10) / 10;
}

export function hakiCallBonus(cost: number): number {
  return Math.round(cost * 0.3 * 10) / 10;
}

export function skillNames(card: Card): string {
  if (!card.skills.length) return "無特技";
  const counts = new Map<number, number>();
  for (const id of card.skills) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n]) => {
      const name = SKILLS[id]?.name ?? "?";
      return n > 1 ? `${name}×${n}` : name;
    })
    .join("　");
}

/** 對戰速查用：特技名＋此卡參數，不含解說。 */
export function compactSkill(card: Card, id: number): string {
  const name = SKILLS[id]?.name ?? "?";
  const copies = card.skills.filter((s) => s === id).length;
  switch (id) {
    case 0:
      return `${name} 打6 ${ambushDamage(card.intel, 6)}%`;
    case 2:
      return `${name} −4秒`;
    case 4:
      return `${name} 0.8C`;
    case 5:
      return `${name} 鎖 0.8C`;
    case 6:
      return `${name} ＋${koageFromCost(card.cost * copies)}`;
    case 7:
      return `${name} ${gikouFromCost(card.cost * copies)}%`;
    case 8:
      return copies > 1 ? `${name} 49C 武＋${copies}` : `${name} 49C`;
    case 10:
      return card.unit === "騎兵" ? `${name} ＋5%` : `${name} ＋10%`;
    case 11:
      return `${name} ${costLabel(card.cost)}`;
    case 12:
      return `${name} ＋${copies}`;
    case 13:
      return `${name} ＋${spearDamageBonus(card.cost)}%`;
    case 14:
      return `${name} 衰 1.3C`;
    case 15:
      return `${name} ${costLabel(card.cost)}`;
    case 17:
      return `${name} ${costLabel(card.cost)}`;
    default:
      return name;
  }
}


export function stratTimeNote(time: string): string {
  switch (time) {
    case "知力時間":
      return "時長隨知力。下列 C 已是此卡計略時長，請勿再加知力×依存（會重複計算）。";
    case "一瞬":
      return "官方寫一瞬。若有列出 C，多為據點／殘留效果時長。";
    case "撤退するまで":
      return "直至此卡撤退為止。";
    case "固定時間":
      return "固定時長，不隨知力增減。";
    default:
      return time;
  }
}

function isKyotenCard(card: Card): boolean {
  return (card.stratCats ?? []).includes("拠点");
}

function durQualifier(note: string): string {
  if (!note) return "";
  if (note.includes("以上")) return "以上";
  if (note.includes("弱")) return "弱";
  if (note.includes("強")) return "強";
  return "";
}

function conditionDuration(note: string): { compact: string; label: string; extra: string } | null {
  const n = note ?? "";
  if (/城に戻るか/.test(n)) {
    return { compact: "至回城", label: "至回城", extra: translateValue(n) };
  }
  if (/味方への効果が終了/.test(n)) {
    return { compact: "跟隨", label: "跟隨", extra: translateValue(n) };
  }
  if (/もとの武力|元の武力/.test(n)) {
    return { compact: "至武力回落", label: "至武力回落", extra: translateValue(n) };
  }
  if (n.length > 10 && !/\d+\s*C/.test(n) && /まで/.test(n)) {
    return { compact: "條件", label: "條件", extra: translateValue(n) };
  }
  return null;
}

function parseDurationValue(value: string): { durC: number; depC: number | null } | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*C/);
  if (!match) return null;
  const dep = value.match(/知力依存[:：]\s*約?(\d+(?:\.\d+)?)C/);
  return { durC: Number(match[1]), depC: dep ? Number(dep[1]) : null };
}

function durationRank(effect: CardEffect, card: Card): number {
  const { label, value } = effect;
  const kyoten = isKyotenCard(card);
  if (/^[+＋]/.test(value.trim())) return -1;
  if (/(撃破時|追加|攻城時)/.test(label)) return -1;
  if (/基本/.test(label)) return 100;
  if (kyoten && /最大/.test(label)) return 96;
  const parsed = parseDurationValue(value);
  if (card.durC != null && parsed && Math.abs(parsed.durC - card.durC) < 0.15) return 94;
  if (label === "効果時間" && /知力依存/.test(value)) return 90;
  if (/自身|味方/.test(label) && /知力依存/.test(value)) return 85;
  if (label === "効果時間") return 40;
  if (/最大/.test(label)) return 15;
  if (/\d/.test(value)) return 10;
  return -1;
}

function isRecastCard(card: Card): boolean {
  return /再度計略を発動/.test(card.stratDesc ?? "");
}

function isRetreatCastCard(card: Card): boolean {
  return /撤退中に計略を発動すると/.test(card.stratDesc ?? "");
}

function recastMarkerIndex(card: Card): number {
  const effects = mainEffects(card);
  if (isRecastCard(card)) {
    return effects.findIndex((effect) => effect.label === "消費士気" || effect.label === "必要士気");
  }
  if (isRetreatCastCard(card)) {
    const i = effects.findIndex((effect) => effect.label.startsWith("効果時間"));
    return i >= 0 ? i + 1 : -1;
  }
  return -1;
}

function pickMainDurationEffect(card: Card): CardEffect | null {
  let pool = mainEffects(card);
  if (isRecastCard(card) || isRetreatCastCard(card)) {
    const idx = recastMarkerIndex(card);
    if (idx > 0) pool = pool.slice(0, idx);
  }
  let best: CardEffect | null = null;
  let bestRank = -1;
  let bestC = -1;
  for (const effect of pool) {
    if (!effect.label.startsWith("効果時間")) continue;
    const rank = durationRank(effect, card);
    const c = parseDurationValue(effect.value)?.durC ?? -1;
    if (rank > bestRank || (rank === bestRank && c > bestC)) {
      best = effect;
      bestRank = rank;
      bestC = c;
    }
  }
  return best;
}

function rippleIntervalC(card: Card): number | null {
  const hit = (card.effects ?? []).find((effect) => effect.label.includes("波紋発生間隔"));
  return hit ? (parseDurationValue(hit.value)?.durC ?? null) : null;
}

/** 本計時長：據點用効果時間(最大)；有短計時勿取短計那一條。 */
function pickMainDuration(card: Card): {
  durC: number | null;
  depC: number | null;
  note: string;
  cap: boolean;
} {
  const preferred = pickMainDurationEffect(card);
  if (preferred) {
    const parsed = parseDurationValue(preferred.value);
    if (parsed) {
      return {
        durC: parsed.durC,
        depC: parsed.depC ?? card.depC,
        note: preferred.value,
        cap: /最大/.test(preferred.label),
      };
    }
  }
  return { durC: card.durC, depC: card.depC, note: card.durNote, cap: false };
}

export function formatStratDuration(card: Card): StratDuration {
  const hint = isKyotenCard(card)
    ? "時長為據點上限。對手破壞據點會提早結束。波紋時長是據點放出的效果，不是計略時長。"
    : stratTimeNote(card.stratTime);
  if (hasPerSchoolDuration(card)) {
    return { compact: "依流派", label: "依流派", seconds: "", dep: "", extra: "各流派時長見下列", hint, cap: false };
  }
  if (hasPerBranchDuration(card) && /部隊数/.test(card.stratDesc ?? "")) {
    return { compact: "依部隊數", label: "依部隊數", seconds: "", dep: "", extra: "各隊數時長見下列", hint, cap: false };
  }
  const scaleFx = pickMainDurationEffect(card);
  if (scaleFx && isScaleDurationValue(scaleFx.value)) {
    return {
      compact: "依特技",
      label: "依特技",
      seconds: "",
      dep: card.stratTime === "固定時間" ? "固定時長，不隨知力" : "",
      extra: "各特技時長見下列",
      hint,
      cap: false,
    };
  }
  const picked = pickMainDuration(card);
  const q = durQualifier(picked.note);
  const kyotenCap = picked.cap && isKyotenCard(card);
  const suffix = q;
  if (picked.durC != null) {
    const core = formatCount(picked.durC);
    const label = suffix ? `${core} ${suffix}` : core;
    const compact = suffix ? `${core}${suffix}` : core;
    const dep =
      picked.depC != null && !kyotenCap
        ? `知力依存 ${formatCount(picked.depC)}／知力`
        : card.stratTime === "固定時間"
          ? "固定時長，不隨知力"
          : "";
    const extraBits: string[] = [];
    if (kyotenCap) extraBits.push("據點可被破壞而縮短");
    else if (card.stratTime === "撤退するまで") extraBits.push("直至撤退");
    else if (card.stratTime === "一瞬") extraBits.push("官方分類：一瞬");
    return {
      compact,
      label,
      seconds: `約 ${countToSeconds(picked.durC)} 秒`,
      dep,
      extra: extraBits.join("　"),
      hint,
      cap: kyotenCap,
    };
  }

  if (card.stratTime === "一瞬") {
    return { compact: "一瞬", label: "一瞬", seconds: "0C", dep: "", extra: "", hint, cap: kyotenCap };
  }
  if (card.stratTime === "撤退するまで") {
    return { compact: "至撤退", label: "直至撤退", seconds: "", dep: "", extra: "", hint, cap: kyotenCap };
  }
  if (card.durNote) {
    const cond = conditionDuration(card.durNote);
    if (cond) {
      return {
        compact: cond.compact,
        label: cond.label,
        seconds: "",
        dep: "",
        extra: cond.extra,
        hint,
        cap: kyotenCap,
      };
    }
    const note = translateValue(card.durNote);
    return { compact: note, label: note, seconds: "", dep: "", extra: "", hint, cap: kyotenCap };
  }
  if (card.stratTime === "知力時間") {
    return { compact: "知力時", label: "知力時間", seconds: "", dep: "", extra: "資料庫未列具體 C 數。", hint, cap: kyotenCap };
  }
  return { compact: translateValue(card.stratTime), label: translateValue(card.stratTime), seconds: "", dep: "", extra: "", hint, cap: kyotenCap };
}

function retagSecondaryDurations(effects: CardEffect[], hide: CardEffect | null): CardEffect[] {
  return effects.map((effect, i, arr) => {
    if (!effect.label.startsWith("効果時間")) return effect;
    if (hide && effect.label === hide.label && effect.value === hide.value) return effect;
    const prev = [...arr.slice(0, i)].reverse().find((row) => !row.label.startsWith("効果時間"));
    if (!prev) return { ...effect, label: "追加効果時間" };
    if (/速度低下/.test(prev.label)) return { ...effect, label: "速度低下時間" };
    if (/武力低下/.test(prev.label)) return { ...effect, label: "武力低下時間" };
    if (/知力低下/.test(prev.label)) return { ...effect, label: "知力低下時間" };
    return { ...effect, label: "追加効果時間" };
  });
}

export type SpinCol = {
  id: "left" | "right";
  title: string;
  rows: StatLine[];
};

export type SpinTiers = {
  shared: StatLine[];
  cols: SpinCol[];
};

/** 向左／向右旋轉斬擊效果不同（鬼神のお松）。 */
export function spinTiers(card: Card): SpinTiers | null {
  const desc = card.stratDesc ?? "";
  if (!/右回りの旋回操作/.test(desc) || !/左回りの旋回操作/.test(desc)) return null;

  const hide = pickMainDurationEffect(card);
  const shared: CardEffect[] = [];
  const right: CardEffect[] = [];
  const left: CardEffect[] = [];
  let side: "shared" | "right" | "left" = "shared";
  let rangeAdded = false;
  const bare = (effect: CardEffect): CardEffect => ({
    ...effect,
    label: effect.label.replace(/[（(](?:基本|追加)[）)]/g, ""),
  });

  for (const raw of card.effects ?? []) {
    const effect = bare(raw);
    if (hide && effect.label === hide.label && effect.value === hide.value) continue;
    if (/[（(]基本[）)]/.test(raw.label)) {
      shared.push(effect);
      side = "right";
      continue;
    }
    if (/[（(]追加[）)]/.test(raw.label)) {
      side = "left";
      left.push(effect);
      continue;
    }
    if (side === "left" && effect.label.startsWith("効果時間") && /斬撃の範囲/.test(desc) && !rangeAdded) {
      left.push({ label: "斬撃範囲", value: "拡大" });
      rangeAdded = true;
    }
    if (side === "left") left.push(effect);
    else if (side === "right") right.push(effect);
    else shared.push(effect);
  }

  return {
    shared: effectRows(shared, hide),
    cols: [
      { id: "left", title: "向左", rows: effectRows(left, hide) },
      { id: "right", title: "向右", rows: effectRows(right, hide) },
    ],
  };
}

export function displayEffects(card: Card): StatLine[] {
  const { rest } = peelSpecials(card);
  const { items } = parseSpecialBranches(card.stratDesc ?? "");
  const filtered =
    items.length >= 2
      ? rest.filter((effect) => effect.label !== "特殊効果" || !isBranchFragment(effect.value, items))
      : rest;
  const hide = pickMainDurationEffect(card);
  const withoutFormation = formationMorale(card)
    ? filtered.filter((effect) => effect.label !== "計略の必要士気")
    : filtered;
  return effectRows(retagSecondaryDurations(withoutFormation, hide), hide, rippleIntervalC(card));
}

/** 奉武：受到友軍陣形效果時，此計略所需士氣下降。 */
export function formationMorale(card: Card): { normal: number; reduced: number } | null {
  if (!/味方の陣形の効果を受けている時、この計略の必要士気が下がる/.test(card.stratDesc ?? "")) return null;
  const hit = (card.effects ?? []).find((effect) => effect.label === "計略の必要士気");
  const delta = Number(String(hit?.value ?? "").replace(/[＋]/g, "+").replace(/[－]/g, "-"));
  if (!Number.isFinite(delta) || delta >= 0) return null;
  return { normal: card.stratCost, reduced: card.stratCost + delta };
}

/** 紫勢力渾身：eiketsudb 由弱至強（無→弱→強），畫面由左至右 強｜弱｜無。 */
export function isKonshinCard(card: Card): boolean {
  return (card.stratCats ?? []).includes("渾身");
}

const KONSHIN_PRIMARY = ["武力上昇", "武力低下", "知力上昇", "知力低下", "復活時兵力"];

function skipKonshinLabel(label: string): boolean {
  return label.startsWith("効果時間") || isDurationEffectLabel(label);
}

function pickKonshinSplitLabel(items: CardEffect[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
  const first = items[0]?.label;
  if (first && (counts.get(first) ?? 0) >= 2) return first;
  const primary = KONSHIN_PRIMARY.find((label) => (counts.get(label) ?? 0) >= 2);
  if (primary) return primary;
  let best = "";
  let bestN = 0;
  for (const item of items) {
    const n = counts.get(item.label) ?? 0;
    if (n > bestN) {
      best = item.label;
      bestN = n;
    }
  }
  return bestN >= 2 ? best : null;
}

function splitKonshinGroups(effects: CardEffect[]): CardEffect[][] {
  const items = effects.filter((e) => !skipKonshinLabel(e.label));
  if (!items.length) return [];
  const splitLabel = pickKonshinSplitLabel(items);
  if (!splitLabel) return [items];

  const firstIdx = items.findIndex((e) => e.label === splitLabel);
  const prefix = firstIdx > 0 ? items.slice(0, firstIdx) : [];
  const rest = items.slice(Math.max(firstIdx, 0));

  const groups: CardEffect[][] = [];
  let current: CardEffect[] = [];
  for (const item of rest) {
    if (item.label === splitLabel && current.some((row) => row.label === splitLabel)) {
      groups.push(current);
      current = [item];
    } else {
      current.push(item);
    }
  }
  if (current.length) groups.push(current);

  if (prefix.length) {
    if (groups.length === 2) groups.unshift(prefix);
    else if (groups.length) groups[0] = [...prefix, ...groups[0]];
    else groups.push(prefix);
  }
  return groups;
}

function collapseKonshinGroups(groups: CardEffect[][]): CardEffect[][] {
  if (groups.length <= 3) return groups;
  if (groups.length === 5) {
    return [groups[0], [...groups[1], ...groups[2]], [...groups[3], ...groups[4]]];
  }
  return [groups[0], groups[1], groups.slice(2).flat()];
}

function effectRows(effects: CardEffect[], hide?: CardEffect | null, rippleC?: number | null): StatLine[] {
  const rows: StatLine[] = [];
  const seen = new Set<string>();
  for (const effect of effects) {
    if (hide) {
      if (effect.label === hide.label && effect.value === hide.value && !isScaleDurationValue(effect.value)) continue;
    } else if ((isDurationEffectLabel(effect.label) || effect.label.startsWith("効果時間")) && !isScaleDurationValue(effect.value)) {
      continue;
    }
    let rawLabel = effect.label;
    if (rippleC != null && effect.label === "効果時間") {
      const parsed = parseDurationValue(effect.value);
      if (parsed && Math.abs(parsed.durC - rippleC) < 0.05) rawLabel = "波紋効果時間";
    }
    const label = translateLabel(rawLabel);
    const value = translateValue(effect.value);
    const key = `${label}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, value });
  }
  return rows;
}

function stripKonshinMoraleMark(value: string): string {
  const rest = value.replace(/^所持士気が必要士気\S*\s+/, "").trim();
  return rest || value;
}

function stripKonshinMarks(effects: CardEffect[]): CardEffect[] {
  return effects.map((effect) => ({ ...effect, value: stripKonshinMoraleMark(effect.value) }));
}

function konshinSpecialTexts(card: Card): Set<string> {
  if (!isKonshinCard(card)) return new Set();
  const groups = collapseKonshinGroups(splitKonshinGroups(card.effects ?? []));
  const texts = new Set<string>();
  for (const group of groups) {
    for (const effect of group) {
      if (effect.label === "特殊効果") texts.add(effect.value);
    }
  }
  return texts;
}

export function konshinTiers(card: Card): KonshinTier[] | null {
  if (!isKonshinCard(card)) return null;
  const groups = collapseKonshinGroups(splitKonshinGroups(card.effects ?? [])).map(stripKonshinMarks);
  if (groups.length < 2) return null;

  const noneRows = effectRows(groups[0] ?? []);
  const weakRows = effectRows(groups[1] ?? groups[0] ?? []);
  const strongRows = effectRows(groups[2] ?? groups[1] ?? groups[0] ?? []);
  const cost = card.stratCost;

  return [
    { id: "strong", title: "強渾身", morale: `士氣 ${cost}`, rows: strongRows },
    { id: "weak", title: "弱渾身", morale: `士氣 ${cost + 1}`, rows: weakRows },
    { id: "none", title: "無渾身", morale: `士氣 ${cost + 2}+`, rows: noneRows },
  ];
}

function parseMoraleMark(value: string): { abs: number } | { delta: number } | null {
  const v = fullwidthNum(value).replace(/\s/g, "").replace(/[▲▼↑↓]/g, "");
  const delta = v.match(/^([+\-＋－])(\d+(?:\.\d+)?)$/);
  if (delta) return { delta: (delta[1] === "-" || delta[1] === "－" ? -1 : 1) * Number(delta[2]) };
  const abs = v.match(/^(\d+(?:\.\d+)?)$/);
  if (abs) return { abs: Number(abs[1]) };
  return null;
}

function isShukuseiStrat(card: Card): boolean {
  return /宿星状態/.test(card.stratDesc ?? "");
}

export type UseCountTier = {
  id: string;
  title: string;
  morale: number | null;
  highlight: boolean;
  rows: StatLine[];
};

function parseUseCountHeadings(desc: string): { n: number; onward: boolean; text: string }[] {
  const lines = (desc ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const headings: { n: number; onward: boolean; text: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^([0-9０-９]+)回目(以降)?\s*[：:](.*)$/);
    if (!m) continue;
    headings.push({ n: parseFullWidthInt(m[1]), onward: Boolean(m[2]), text: m[3].trim() });
  }
  return headings;
}

function useCountMainDesc(desc: string): string {
  const lines = (desc ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const main: string[] = [];
  for (const line of lines) {
    if (/^[0-9０-９]+回目/.test(line)) break;
    main.push(line);
  }
  return main.join("\n");
}

function isUseCountCard(card: Card): boolean {
  return /使用した回数によって/.test(card.stratDesc ?? "") || parseUseCountHeadings(card.stratDesc ?? "").length >= 1;
}

function useCountTitle(n: number, onward: boolean): string {
  return onward ? `第${n}次起` : `第${n}次`;
}

function stripUseMark(value: string): string {
  return value.replace(/計略発動\s*[0-9０-９]+回目\s*/g, "").trim();
}

function splitByUseMarksInValue(effects: CardEffect[]): CardEffect[][] | null {
  const groups = new Map<number, CardEffect[]>();
  let tagged = 0;
  for (const effect of effects) {
    const m = effect.value.match(/計略発動\s*([0-9０-９]+)回目/);
    if (!m) continue;
    tagged += 1;
    const n = parseFullWidthInt(m[1]);
    const list = groups.get(n) ?? [];
    list.push({ ...effect, value: stripUseMark(effect.value) || "有" });
    groups.set(n, list);
  }
  if (tagged < 2) return null;
  const keys = [...groups.keys()].sort((a, b) => a - b);
  return keys.map((n) => groups.get(n) ?? []);
}

function splitByMoraleMarks(effects: CardEffect[], baseCost: number): { morale: number; items: CardEffect[] }[] | null {
  const marks: { i: number; morale: number }[] = [];
  effects.forEach((effect, i) => {
    if (effect.label !== "必要士気") return;
    const mark = parseMoraleMark(effect.value);
    if (!mark) return;
    marks.push({ i, morale: "abs" in mark ? mark.abs : baseCost + mark.delta });
  });
  if (!marks.length) return null;
  const groups: { morale: number; items: CardEffect[] }[] = [
    { morale: baseCost, items: effects.slice(0, marks[0].i) },
  ];
  for (let k = 0; k < marks.length; k++) {
    const from = marks[k].i + 1;
    const to = k + 1 < marks.length ? marks[k + 1].i : effects.length;
    groups.push({
      morale: marks[k].morale,
      items: effects.slice(from, to).filter((effect) => effect.label !== "必要士気"),
    });
  }
  return groups.length >= 2 ? groups : null;
}

const USE_CUES: [RegExp, string][] = [
  [/射撃ダメージ/, "射撃ダメージ"],
  [/貫通/, "貫通"],
  [/攻撃回数/, "攻撃回数"],
  [/兵力が回復|兵力回復/, "兵力回復"],
  [/移動速度/, "速度上昇"],
  [/射撃時の攻撃間隔|攻撃間隔/, "射撃間隔"],
  [/射程/, "射程"],
  [/知力による戦闘|知力戦闘/, "知力戦闘"],
  [/斬撃/, "斬撃"],
  [/知力/, "知力上昇"],
  [/武力/, "武力上昇"],
];

function splitByHeadingCues(effects: CardEffect[], headings: { text: string }[]): CardEffect[][] | null {
  if (headings.length < 1) return null;
  const starts = [0];
  let from = 0;
  for (const heading of headings) {
    let idx = -1;
    for (const [re, needle] of USE_CUES) {
      if (!re.test(heading.text)) continue;
      idx = effects.findIndex(
        (effect, i) => i > from && (effect.label.includes(needle) || effect.value.includes(needle)),
      );
      if (idx >= 0) break;
    }
    if (idx < 0) return null;
    starts.push(idx);
    from = idx;
  }
  const groups: CardEffect[][] = [];
  for (let i = 0; i < starts.length; i++) {
    groups.push(effects.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : effects.length));
  }
  return groups.length >= 2 ? groups : null;
}

export function useCountTiers(card: Card): UseCountTier[] | null {
  if (!isUseCountCard(card)) return null;
  const headings = parseUseCountHeadings(card.stratDesc ?? "");
  const hide = pickMainDurationEffect(card);
  const effects = mainEffects(card);
  const body = effects.filter((effect) => {
    if (effect.label === "必要士気") return false;
    if (hide && effect.label === hide.label && effect.value === hide.value) return false;
    return !isDurationEffectLabel(effect.label) && !effect.label.startsWith("効果時間");
  });

  const expected = headings.length + 1;
  let groups: CardEffect[][] | null = null;
  let morales: (number | null)[] | null = null;

  const byMark = splitByUseMarksInValue(body);
  if (byMark && byMark.length >= 2) {
    groups = byMark;
  }

  if (!groups) {
    const byMorale = splitByMoraleMarks(effects, card.stratCost);
    if (byMorale && byMorale.length >= 2) {
      groups = byMorale.map((g) => g.items.filter((e) => e.label !== "必要士気"));
      morales = byMorale.map((g) => g.morale);
    }
  }

  if (!groups) {
    const items = body.filter((e) => e.label !== "必要士気");
    const splitLabel = pickKokouSplitLabel(items, expected || null);
    if (splitLabel) {
      const repeating = splitRepeatingGroups(items, splitLabel);
      if (repeating.length >= 2 && (!expected || Math.abs(repeating.length - expected) <= 1)) {
        groups = repeating;
      }
    }
  }

  if (!groups) groups = splitByHeadingCues(body.filter((e) => e.label !== "必要士気"), headings);

  if (!groups || groups.length < 2) return null;

  const lastOnward = headings[headings.length - 1]?.onward ?? groups.length > (headings[headings.length - 1]?.n ?? 0);
  return groups.map((group, i) => {
    const heading = headings.find((h) => h.n === i + 1);
    const onward = heading?.onward ?? (i === groups!.length - 1 && lastOnward && i > 0);
    const n = heading?.n ?? i + 1;
    return {
      id: `use-${n}`,
      title: useCountTitle(n, onward),
      morale: morales?.[i] ?? (morales ? null : card.stratCost),
      highlight: i === groups!.length - 1,
      rows: effectRows(
        group.map((effect) => ({ ...effect, value: stripUseMark(effect.value) || effect.value || "有" })),
        hide,
      ),
    };
  });
}

export type SenkiCol = {
  id: "before" | "after";
  title: string;
  highlight: boolean;
  rows: StatLine[];
};

function isSenkiCard(card: Card): boolean {
  return /戦器を解放していなければ/.test(card.stratDesc ?? "");
}

function parseSenkiClauses(desc: string): { main: string; before: string; after: string } | null {
  const m = (desc ?? "").replace(/<br\s*\/?>/gi, "\n").match(
    /自軍が戦器を解放していなければ(.+?)(?:、|。)\s*戦器を解放していれば(.+)/s,
  );
  if (!m) return null;
  const cut = desc.search(/さらに自軍が戦器を解放していなければ|自軍が戦器を解放していなければ/);
  const main = (cut >= 0 ? desc.slice(0, cut) : "").replace(/さらに\s*$/, "").replace(/<br\s*\/?>/gi, "\n").trim();
  return { main, before: m[1].trim(), after: m[2].trim() };
}

const SENKI_CUES: [RegExp, string][] = [
  [/槍撃ダメージ/, "槍撃ダメージ"],
  [/斬撃ダメージ/, "斬撃ダメージ"],
  [/乱戦中の攻撃速度/, "乱戦攻撃速度"],
  [/武力によるダメージを軽減/, "武力ダメージ軽減"],
  [/兵力が回復/, "兵力回復"],
  [/士気が上が/, "士気増加"],
  [/移動速度が上が/, "速度上昇"],
  [/移動速度が下が|移動速度を下げ/, "速度低下"],
  [/武力を徐々に下げ/, "武力低下(追加)"],
  [/武力が上が/, "武力上昇"],
  [/武力を下げ|武力が下が/, "武力低下"],
];

function senkiClauseLabels(text: string): string[] {
  const labels: string[] = [];
  let rest = text;
  if (/武力と移動速度と斬撃ダメージ/.test(rest)) {
    labels.push("武力上昇", "速度上昇", "斬撃ダメージ");
    rest = rest.replace(/武力と移動速度と斬撃ダメージ/, " ");
  } else if (/武力と移動速度/.test(rest)) {
    labels.push("武力上昇", "速度上昇");
    rest = rest.replace(/武力と移動速度/, " ");
  }
  for (const [re, label] of SENKI_CUES) {
    if (!re.test(rest)) continue;
    labels.push(label);
    rest = rest.replace(re, " ");
  }
  return labels;
}

function senkiMatch(effect: CardEffect, want: string): boolean {
  return effect.label === want || effect.label.startsWith(want);
}

function takeSenkiLabels(effects: CardEffect[], wants: string[]): { taken: CardEffect[]; rest: CardEffect[] } {
  const taken: CardEffect[] = [];
  const used = new Set<number>();
  for (const want of wants) {
    const i = effects.findIndex((effect, idx) => !used.has(idx) && senkiMatch(effect, want));
    if (i < 0) continue;
    taken.push(effects[i]);
    used.add(i);
  }
  return { taken, rest: effects.filter((_, i) => !used.has(i)) };
}

export function senkiTiers(card: Card): SenkiCol[] | null {
  if (!isSenkiCard(card)) return null;
  const clauses = parseSenkiClauses(card.stratDesc ?? "");
  if (!clauses) return null;
  const hide = pickMainDurationEffect(card);
  const body = mainEffects(card).filter((effect) => {
    if (hide && effect.label === hide.label && effect.value === hide.value) return false;
    return !isDurationEffectLabel(effect.label) && !effect.label.startsWith("効果時間");
  });
  if (body.length < 2) return null;

  const powerHits = body.filter((effect) => effect.label === "武力上昇" || effect.label.startsWith("武力上昇"));
  let beforeFx: CardEffect[];
  let afterFx: CardEffect[];
  if (powerHits.length >= 2) {
    const groups = splitRepeatingGroups(body, powerHits[0].label);
    if (groups.length < 2) return null;
    beforeFx = groups[0];
    afterFx = groups.slice(1).flat();
  } else {
    const shared = takeSenkiLabels(body, senkiClauseLabels(clauses.main));
    const before = takeSenkiLabels(shared.rest, senkiClauseLabels(clauses.before));
    const after = takeSenkiLabels(before.rest, senkiClauseLabels(clauses.after));
    beforeFx = [...shared.taken, ...before.taken];
    afterFx = [...shared.taken, ...after.taken, ...after.rest];
  }

  if (!beforeFx.length && !afterFx.length) return null;
  return [
    { id: "before", title: "戰器未解放", highlight: false, rows: effectRows(beforeFx, hide) },
    { id: "after", title: "戰器已解放", highlight: true, rows: effectRows(afterFx, hide) },
  ];
}

export type SchoolCol = {
  id: string;
  title: string;
  note: string;
  rows: StatLine[];
};

const SCHOOL_KEY = /^(部隊|士気|城塞|兵種|琥煌|騎兵|槍兵|弓兵|[0-9０-９]+部隊|味方[≧＜]|敵[≧＜])/;

function hasPerBranchDuration(card: Card): boolean {
  const durs = (card.effects ?? []).filter((effect) => effect.label.startsWith("効果時間") && /知力依存/.test(effect.value));
  if (durs.length < 2) return false;
  return new Set(durs.map((effect) => effect.value.replace(/[▲▼↑↓\s]/g, ""))).size > 1;
}

function isScaleDurationValue(value: string): boolean {
  const marks = value.match(/計\s*[0-9０-９]+\s*つ/g) ?? [];
  const beats = value.match(/\d+(?:\.\d+)?\s*C/g) ?? [];
  return marks.length >= 2 || (marks.length >= 1 && beats.length >= 2);
}

function hasPerSchoolDuration(card: Card): boolean {
  return /選択した流派/.test(card.stratDesc ?? "") && hasPerBranchDuration(card);
}

function foldAttachedDurations(effects: CardEffect[]): CardEffect[] {
  const out: CardEffect[] = [];
  for (const effect of effects) {
    const attached =
      effect.label.startsWith("効果時間") &&
      !/知力依存/.test(effect.value) &&
      (/[:：]/.test(effect.value) || (/^[約\d]/.test(effect.value.trim()) && out.length > 0 && /[:：]/.test(out[out.length - 1]?.value ?? "")));
    if (attached && out.length) {
      const prev = out[out.length - 1];
      out[out.length - 1] = { ...prev, value: `${prev.value} ${effect.value}` };
      continue;
    }
    out.push(effect);
  }
  return out;
}

export function schoolTiers(card: Card): SchoolCol[] | null {
  const branched = parseSpecialBranches(card.stratDesc ?? "");
  if (branched.items.length < 2) return null;
  if (!branched.items.every((item) => SCHOOL_KEY.test(item.key))) return null;

  if (branched.items.some((item) => item.text === "なし" || item.text === "無し")) return null;

  const hide = hasPerBranchDuration(card) ? null : pickMainDurationEffect(card);
  const body = foldAttachedDurations(mainEffects(card));

  let groups: CardEffect[][] | null = null;
  const valueNeedles = branched.items.map((item) => {
    if (/味方\s*≧\s*敵/.test(item.key)) return "味方部隊数≧敵部隊数";
    if (/味方\s*＜\s*敵/.test(item.key)) return "味方部隊数＜敵部隊数";
    return "";
  });
  if (valueNeedles.every(Boolean)) {
    const buckets: CardEffect[][] = branched.items.map(() => []);
    let cur = 0;
    for (const effect of body) {
      const hit = valueNeedles.findIndex((needle) => needle && effect.value.includes(needle));
      if (hit >= 0) cur = hit;
      buckets[cur].push(effect);
    }
    if (buckets.every((g) => g.length)) groups = buckets;
  }

  const up = body.filter((effect) => effect.label === "武力上昇" || effect.label.startsWith("武力上昇"));
  const down = body.filter((effect) => effect.label === "武力低下" || effect.label.startsWith("武力低下("));
  const tagged = body.some((effect) => /味方部隊数[≧＜]|敵部隊数/.test(effect.value));
  if (!groups && !tagged && up.length >= branched.items.length) groups = splitRepeatingGroups(body, up[0].label);
  else if (!groups && !tagged && down.length >= branched.items.length) groups = splitRepeatingGroups(body, down[0].label);

  if (!groups || groups.length < branched.items.length) {
    const shared = takeSenkiLabels(
      body.filter((effect) => !effect.label.startsWith("効果時間")),
      senkiClauseLabels(branched.main),
    );
    const unique = shared.rest.filter((effect) => !effect.label.startsWith("効果時間") && !isDurationEffectLabel(effect.label));
    if (unique.length === branched.items.length) {
      groups = unique.map((row) => [...shared.taken, row]);
    }
  }
  if (!groups || groups.length < branched.items.length) {
    const durCuts: number[] = [];
    body.forEach((effect, i) => {
      if (effect.label.startsWith("効果時間") || isDurationEffectLabel(effect.label)) durCuts.push(i);
    });
    if (durCuts.length + 1 >= branched.items.length && durCuts.length >= 1) {
      const cuts = [0, ...durCuts.map((i) => i + 1)].slice(0, branched.items.length);
      groups = cuts.map((start, i) => body.slice(start, i + 1 < cuts.length ? cuts[i + 1] : body.length));
    }
  }
  if (!groups || groups.length < branched.items.length) {
    groups = splitByHeadingCues(
      body.filter((effect) => !effect.label.startsWith("効果時間")),
      branched.items,
    );
  }
  if (!groups || groups.length < branched.items.length) return null;

  if (hide) {
    groups = groups.map((group) =>
      group.filter((effect) => !(effect.label === hide.label && effect.value === hide.value)),
    );
  } else {
    groups = groups.map((group) => {
      if (group.length < 2) return group;
      const last = group[group.length - 1];
      if (last.label.startsWith("効果時間") && /自身が知力/.test(last.value)) return group.slice(0, -1);
      return group;
    });
  }

  const titles = branched.items.map((item) => translateLabel(item.key.replace(/[・･]/g, "／")));
  if (groups.length === titles.length + 1) titles.push("琥煌");

  const keepDur: CardEffect = hide ?? { label: "__dur__", value: "__dur__" };
  return groups.slice(0, titles.length).map((group, i) => ({
    id: titles[i] ?? String(i),
    title: titles[i] ?? "其他",
    note: i < branched.items.length ? translateDesc(branched.items[i].text) : "無追加效果",
    rows: effectRows(group, keepDur),
  }));
}

export type RecastCol = {
  id: "first" | "again";
  title: string;
  note: string;
  highlight: boolean;
  rows: StatLine[];
};

function stripRecastMark(value: string): string {
  const text = value
    .replace(/計略効果外に使用したとき\s*/g, "")
    .replace(/計略効果中に再使用したとき\s*/g, "")
    .trim();
  if (text) return text;
  if (/計略効果外に使用したとき|計略効果中に再使用したとき/.test(value)) return "有";
  return value;
}

export function recastTiers(card: Card): RecastCol[] | null {
  const recast = isRecastCard(card);
  const retreat = isRetreatCastCard(card);
  if (!recast && !retreat) return null;
  const idx = recastMarkerIndex(card);
  if (idx < 1) return null;
  const effects = mainEffects(card).map((effect) => {
    const value = stripRecastMark(effect.value);
    if (effect.label === "消費士気" || effect.label === "必要士気") {
      return { label: "再発動士気", value };
    }
    return { ...effect, value };
  });
  const first = effects.slice(0, idx);
  const again = effects.slice(idx);
  if (!first.length || !again.length) return null;
  const keepDur: CardEffect = { label: "__dur__", value: "__dur__" };
  if (retreat) {
    return [
      {
        id: "first",
        title: "在場發動",
        note: "發動後自身會撤退",
        highlight: false,
        rows: effectRows(first, keepDur),
      },
      {
        id: "again",
        title: "撤退中發動",
        note: "改為在撤退處復活，效果不同",
        highlight: true,
        rows: effectRows(again, keepDur),
      },
    ];
  }
  return [
    {
      id: "first",
      title: "初次發動",
      note: "",
      highlight: false,
      rows: effectRows(first, keepDur),
    },
    {
      id: "again",
      title: "效果中再發動",
      note: "條件與效果有別於初次",
      highlight: true,
      rows: effectRows(again, keepDur),
    },
  ];
}

export function shukuseiTiers(card: Card): ShukuseiTier[] | null {
  if (!isShukuseiStrat(card)) return null;
  const effects = card.effects ?? [];
  const marks: { i: number; mark: { abs: number } | { delta: number } }[] = [];
  effects.forEach((effect, i) => {
    if (effect.label !== "必要士気") return;
    const mark = parseMoraleMark(effect.value);
    if (mark) marks.push({ i, mark });
  });
  if (!marks.length) return null;

  const hide = pickMainDurationEffect(card);
  const sliceRows = (from: number, to: number) =>
    effectRows(
      effects.slice(from, to).filter((effect) => effect.label !== "必要士気"),
      hide,
    );

  let normalRows: StatLine[];
  let starRows: StatLine[];
  let moraleNormal = card.stratCost;
  let moraleStar = card.stratCost;

  if (marks.length >= 2) {
    const [first, second] = marks;
    normalRows = sliceRows(first.i + 1, second.i);
    starRows = sliceRows(second.i + 1, effects.length);
    moraleNormal = "abs" in first.mark ? first.mark.abs : card.stratCost + first.mark.delta;
    moraleStar = "abs" in second.mark ? second.mark.abs : moraleNormal + second.mark.delta;
  } else {
    const { i, mark } = marks[0];
    normalRows = sliceRows(0, i);
    starRows = sliceRows(i + 1, effects.length);
    moraleNormal = card.stratCost;
    moraleStar = "abs" in mark ? mark.abs : card.stratCost + mark.delta;
    if (!starRows.length) starRows = normalRows;
  }

  if (!normalRows.length && !starRows.length) return null;

  return [
    { id: "star", title: "宿星", morale: moraleStar, rows: starRows },
    { id: "normal", title: "非宿星", morale: moraleNormal, rows: normalRows },
  ];
}

export type KokouCol = {
  id: string;
  title: string;
  swords: number | null;
  highlight: boolean;
  rows: StatLine[];
};

export type KokouTiers = {
  max: number | null;
  note: string;
  shared: StatLine[];
  extra: { title: string; rows: StatLine[] } | null;
  cols: KokouCol[];
  specials: string[];
};

export function isKokouCard(card: Card): boolean {
  return (card.stratCats ?? []).includes("琥煌");
}

function parseFullWidthInt(raw: string): number {
  const z = "０１２３４５６７８９";
  return Number(
    [...raw].map((ch) => {
      const i = z.indexOf(ch);
      return i >= 0 ? String(i) : ch;
    }).join(""),
  );
}

function parseKokouMax(desc: string): number | null {
  const m = desc.match(/最大消費\s*([0-9０-９]+)/);
  if (!m) return null;
  const n = parseFullWidthInt(m[1]);
  return Number.isFinite(n) ? n : null;
}

function pickKokouSplitLabel(items: CardEffect[], expected: number | null): string | null {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
  const ranked = [...counts.entries()]
    .filter(([label]) => label !== "特殊効果")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (expected) {
    const exact = ranked.find(([, n]) => n === expected);
    if (exact) return exact[0];
    const almost = ranked.find(([, n]) => n === expected - 1 || n === expected + 1);
    if (almost) return almost[0];
  }
  return ranked[0] && ranked[0][1] >= 2 ? ranked[0][0] : null;
}

function splitRepeatingGroups(items: CardEffect[], splitLabel: string): CardEffect[][] {
  const groups: CardEffect[][] = [];
  let current: CardEffect[] = [];
  for (const item of items) {
    if (item.label === splitLabel && current.some((row) => row.label === splitLabel)) {
      groups.push(current);
      current = [item];
    } else {
      current.push(item);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

export function kokouTiers(card: Card): KokouTiers | null {
  if (!isKokouCard(card)) return null;
  const items = mainEffects(card).filter((e) => !skipKonshinLabel(e.label));
  if (!items.length) return null;

  const max = parseKokouMax(card.stratDesc);
  const expected = max == null ? null : max + 1;
  const splitLabel = pickKokouSplitLabel(items, expected);
  const firstIdx = splitLabel ? items.findIndex((e) => e.label === splitLabel) : 0;
  const shared = firstIdx > 0 ? items.slice(0, firstIdx) : [];
  const rest = items.slice(Math.max(firstIdx, 0));
  let groups = splitLabel ? splitRepeatingGroups(rest, splitLabel) : [rest];

  let extra: CardEffect[] | null = null;
  if (expected && groups.length === expected + 1) {
    extra = groups[0];
    groups = groups.slice(1);
  }
  if (expected && groups.length === expected - 1 && groups.length >= 1) {
    const core = new Set(groups[0].map((e) => e.label));
    const last = groups[groups.length - 1];
    const cut = last.findIndex((e, i) => i > 0 && !core.has(e.label) && e.label !== splitLabel);
    if (cut > 0) groups = [...groups.slice(0, -1), last.slice(0, cut), last.slice(cut)];
  }

  if (groups.length < 2) return null;

  const specials = [...shared, ...(extra ?? []), ...groups.flat()].flatMap((effect) =>
    effect.label === "特殊効果" ? [effect.value] : [],
  );

  if (max == null) {
    return {
      max: 6,
      note: "依發動時所持劍數（並非自行選擇消耗量）。",
      shared: effectRows(shared),
      extra: extra ? { title: "無友軍", rows: effectRows(extra) } : null,
      cols: [
        { id: "0-5", title: "0–5劍", swords: null, highlight: false, rows: effectRows(groups[0] ?? []) },
        {
          id: "6",
          title: "6劍",
          swords: 6,
          highlight: true,
          rows: effectRows(groups.slice(1).flat()),
        },
      ],
      specials,
    };
  }

  return {
    max,
    note: `琥煌槽最多 6 劍。發動時消耗 0–${max} 劍，消耗愈多效果愈強。`,
    shared: effectRows(shared),
    extra: extra ? { title: "無友軍", rows: effectRows(extra) } : null,
    cols: groups.map((group, i) => ({
      id: String(i),
      title: `${i}劍`,
      swords: i,
      highlight: i === groups.length - 1,
      rows: effectRows(group),
    })),
    specials,
  };
}


export function displayArea(card: Card): string {
  return translateArea(card.area ?? "");
}

export type Tanken = {
  name: string;
  cost: string | null;
  text: string;
  rows: StatLine[];
};

function fullwidthNum(input: string): string {
  return input.replace(/[０-９]/g, (ch) => String(ch.charCodeAt(0) - 0xff10)).replace(/．/g, ".");
}

function stripBranchTail(value: string): string {
  const cut = value.search(/\s*[◇◆]/);
  if (cut < 0) return value;
  const tail = value.slice(cut);
  if (/追加効果|に応じて|以下に変化|[:：]\s*$/.test(tail)) return value.slice(0, cut).trim();
  return value;
}

function isBranchFragment(value: string, items: { key: string; text: string }[]): boolean {
  const v = value.replace(/\s+/g, "");
  if (/[:：]\s*$/.test(value)) return true;
  return items.some((item) => {
    const t = item.text.replace(/\s+/g, "");
    if (t.length >= 4 && v.includes(t.slice(0, 8))) return true;
    if (v.length >= 4 && t.includes(v.slice(0, 8))) return true;
    return false;
  });
}

const SPECIAL_NEST =
  /^(武力上昇|武力低下|速度上昇|速度低下|知力上昇|知力低下|兵力減少|ダメージ|固定ダメージ)/;

function peelSpecials(card: Card): { rest: CardEffect[]; specials: { text: string; nested: CardEffect[] }[] } {
  const hide = pickMainDurationEffect(card);
  const effects = mainEffects(card).map((effect) => ({
    ...effect,
    value: stripBranchTail(effect.value),
  }));
  const rest: CardEffect[] = [];
  const specials: { text: string; nested: CardEffect[] }[] = [];
  let i = 0;
  while (i < effects.length) {
    const cur = effects[i];
    if (cur.label !== "特殊効果") {
      rest.push(cur);
      i += 1;
      continue;
    }
    const nested: CardEffect[] = [];
    i += 1;
    const nestStats = /陣形|設置|撤退時/.test(cur.value);
    if (!nestStats) {
      specials.push({ text: cur.value, nested });
      continue;
    }
    while (i < effects.length && effects[i].label !== "特殊効果") {
      const next = effects[i];
      if (hide && next.label === hide.label && next.value === hide.value) break;
      const nestable =
        next.label.startsWith("効果時間") || SPECIAL_NEST.test(next.label);
      if (!nestable) break;
      nested.push(next);
      i += 1;
    }
    specials.push({ text: cur.value, nested });
  }
  return { rest, specials };
}

const BRANCH_TRIGGER = /以下の効果|効果が変わる|以下に変化|部隊数に応じて/;
const BRANCH_SKIP = /^(?:短計|[0-9０-９]+消費)/;

function parseBranchLine(line: string): { key: string; text: string } | null {
  const m = line.match(/^(.{1,24}?)[：:](.+)$/);
  if (!m) return null;
  const key = m[1].trim();
  const text = m[2].trim();
  if (!key || !text || BRANCH_SKIP.test(key) || /[。]/.test(key)) return null;
  return { key, text };
}

function parseSpecialBranches(desc: string): { main: string; items: { key: string; text: string }[] } {
  const raw = (desc ?? "").replace(/<br\s*\/?>/gi, "\n");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (!BRANCH_TRIGGER.test(lines[i])) continue;
    const items: { key: string; text: string }[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const row = parseBranchLine(lines[j]);
      if (!row) break;
      items.push(row);
    }
    if (items.length >= 2) {
      return { main: [...lines.slice(0, i + 1), ...lines.slice(j)].join("\n"), items };
    }
  }
  return { main: desc ?? "", items: [] };
}

export type SpecialItem = {
  key?: string;
  text: string;
  rows?: StatLine[];
};

export type SpecialBlock = {
  items: SpecialItem[];
};

export function cardSpecial(card: Card): SpecialBlock | null {
  const branched = parseSpecialBranches(card.stratDesc ?? "");
  if (branched.items.length >= 2) {
    return {
      items: branched.items.map((item) => ({
        key: translateLabel(item.key.replace(/[・･]/g, "／")),
        text: translateDesc(item.text),
      })),
    };
  }
  if (isUseCountCard(card)) return null;
  const { specials } = peelSpecials(card);
  if (!specials.length) return null;
  const hide = pickMainDurationEffect(card);
  const covered = konshinSpecialTexts(card);
  if (isKokouCard(card)) {
    for (const text of kokouTiers(card)?.specials ?? []) {
      covered.add(text);
      covered.add(stripBranchTail(text));
    }
  }
  const seen = new Set<string>();
  const items = specials.flatMap((item) => {
    if (covered.has(item.text)) return [];
    const text = translateDesc(item.text);
    const rows = item.nested.length ? effectRows(item.nested, hide) : undefined;
    const key = `${text}|${(rows ?? []).map((row) => `${row.label}:${row.value}`).join(";")}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ text, rows }];
  });
  if (!items.length) return null;
  return { items };
}

function parseTankenBlocks(desc: string): { main: string; blocks: { name: string; cost: string | null; text: string }[] } {
  const raw = (desc ?? "").replace(/<br\s*\/?>/gi, "\n");
  const idx = raw.search(/短計[・･]/);
  if (idx < 0) return { main: desc ?? "", blocks: [] };
  const main = raw.slice(0, idx).trim();
  const tail = raw.slice(idx);
  const re = /短計[・･]([^【\n：:]{1,24})(?:【([^】]+)】)?\s*[：:]?\s*/g;
  const marks: { name: string; cost: string | null; start: number; body: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(tail))) {
    marks.push({
      name: m[1].trim(),
      cost: m[2] ? fullwidthNum(m[2]).trim() : null,
      start: m.index,
      body: m.index + m[0].length,
    });
  }
  const blocks = marks.map((mark, i) => ({
    name: mark.name,
    cost: mark.cost,
    text: tail.slice(mark.body, i + 1 < marks.length ? marks[i + 1].start : tail.length).trim(),
  }));
  return { main, blocks };
}

const TANKEN_KEEP =
  /再使用間隔|特殊効果|弾き距離|突撃距離|知力ダメージ|武力ダメージ|固定ダメージ|ダメージ係数|移動不可|ため時間|跳躍距離|兵種変化|敵城門ダメージ|ボール/;

function tankenEffectIndex(effects: CardEffect[]): number {
  let seal = -1;
  let reuse = -1;
  effects.forEach((effect, i) => {
    if (effect.label === "計略封印") seal = i;
    if (effect.label === "再使用間隔") reuse = i;
  });
  if (seal >= 0 && (reuse < 0 || seal < reuse)) return seal + 1;
  if (reuse < 0) return -1;
  let start = reuse;
  for (let i = reuse - 1; i >= 0; i--) {
    const lab = effects[i].label;
    const val = effects[i].value;
    if (lab === "計略封印") break;
    if (lab.startsWith("効果時間") && /知力依存|撤退|旗陣形/.test(val)) break;
    if (lab !== "効果時間" && !TANKEN_KEEP.test(lab)) break;
    start = i;
  }
  return start;
}

function mainEffects(card: Card): CardEffect[] {
  const effects = card.effects ?? [];
  if (!parseTankenBlocks(card.stratDesc ?? "").blocks.length) return effects;
  const idx = tankenEffectIndex(effects);
  return idx >= 0 ? effects.slice(0, idx) : effects;
}

function tankenRows(effects: CardEffect[]): StatLine[] {
  const rows: StatLine[] = [];
  const seen = new Set<string>();
  for (const effect of effects) {
    const label = translateLabel(effect.label);
    const value = translateValue(effect.value);
    const key = `${label}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, value });
  }
  return rows;
}

export function cardTanken(card: Card): Tanken[] {
  const { blocks } = parseTankenBlocks(card.stratDesc ?? "");
  if (!blocks.length) return [];
  const effects = card.effects ?? [];
  const idx = tankenEffectIndex(effects);
  const fx = idx >= 0 ? effects.slice(idx) : [];
  return blocks.map((block, i) => ({
    name: block.name,
    cost: block.cost,
    text: translateDesc(block.text),
    rows: i === 0 ? tankenRows(fx) : [],
  }));
}

export function displayMainStratDesc(card: Card): string {
  return translateDesc(card.stratDesc ?? "");
}

export function displayCats(card: Card): string[] {
  return (card.stratCats ?? []).map(translateCat);
}

export function displayStratDesc(card: Card): string {
  return translateDesc(card.stratDesc ?? "");
}

export function skillCardFacts(card: Card, skillId: number): StatLine[] {
  const copies = card.skills.filter((id) => id === skillId).length;
  switch (skillId) {
    case 0:
      return [
        { label: "此卡知力", value: String(card.intel) },
        { label: "打知力 6", value: `${ambushDamage(card.intel, 6)}%` },
        { label: "打知力 8", value: `${ambushDamage(card.intel, 8)}%` },
        { label: "打知力 10", value: `${ambushDamage(card.intel, 10)}%` },
      ];
    case 2: {
      const cut = copies >= 3 ? 9 : copies === 2 ? 7 : 4;
      const wait = 30 - cut;
      const c = (wait / 2.4).toFixed(1);
      return [
        { label: "此卡復活", value: `${copies} 個　−${cut} 秒` },
        { label: "等待", value: `${wait} 秒（約 ${c}C）` },
      ];
    }
    case 5:
      return [
        { label: "鎖定", value: "2 秒（約 0.8C）" },
        { label: "此卡成本", value: `${costLabel(card.cost)}　追加傷害隨 Cost 上升` },
        { label: "參考", value: "2.5 Cost 時每擊約 +0.5%" },
      ];
    case 6:
      return [
        {
          label: "開場士氣",
          value: `＋${koageFromCost(card.cost * copies)}　（${costLabel(card.cost)} × 0.2${copies > 1 ? ` ×${copies}` : ""}）`,
        },
      ];
    case 7:
      return [
        {
          label: "開場流派槽",
          value: `約 ${gikouFromCost(card.cost * copies)}%　（${costLabel(card.cost)}${copies > 1 ? ` ×${copies}` : ""}）`,
        },
      ];
    case 8:
      return [
        { label: "持續", value: "99C → 50C（約 49C／118 秒）" },
        { label: "加成", value: copies > 1 ? `武＋${copies} 知＋${copies}` : "武＋1 知＋1" },
      ];
    case 10:
      return [{ label: "此卡移速", value: card.unit === "騎兵" ? "＋約 5%" : "＋約 10%" }];
    case 11:
      return [{ label: "此卡貢獻", value: `${costLabel(card.cost)}（同時代大兵合計）` }];
    case 12:
      return [{ label: "最大士氣", value: `＋${copies}（上限 15）` }];
    case 13:
      return [
        { label: "此卡槍擊", value: `＋約 ${spearDamageBonus(card.cost)}%` },
        {
          label: "槍長",
          value: `${costLabel(card.cost)} 加長${card.cost >= 3.5 ? "（約 ＋45%）" : "（3.5 Cost 約 ＋45%）"}`,
        },
      ];
    case 14:
      return [
        { label: "發動", value: "槽約 1/3　武＋2 知＋2" },
        { label: "衰減", value: "每 1.3C −2.5%" },
      ];
    case 15:
      return [
        { label: "霸氣累積", value: "約 1.3 倍" },
        { label: "英傑呼應", value: `此卡 ${costLabel(card.cost)} 約 ＋${hakiCallBonus(card.cost)}%` },
      ];
    case 16:
      return [
        { label: "槽增加", value: "造成傷害的 60%" },
        { label: "100% / 200%", value: "武知 ＋1 / ＋2" },
      ];
    case 17:
      return [
        {
          label: "此卡貢獻",
          value: `${costLabel(card.cost * copies)}　最大兵力 ＋約 ${Math.round(card.cost * copies * 4 * 10) / 10}%`,
        },
      ];
    default:
      return [];
  }
}
