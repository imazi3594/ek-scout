export type ChangelogEntry = {
  date: string;
  title: string;
  features?: string[];
  cards?: string[];
};

/** 更新日誌：只寫做過乜／武將名，唔寫技術細節。新發佈時在陣列最前追加。 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-01",
    title: "修正卡牌中文說明",
    features: ["修正回報所指嘅中文說明"],
    cards: [
      "秋山虎繁",
      "張任",
      "魔天ルシファー",
      "鄒忌",
      "大庭景親",
      "島左近",
      "春申君",
      "オーベロン",
      "趙雲子龍",
      "水心",
      "長宗我部信親",
      "袁術",
      "ガルオー",
      "明智光秀",
      "島津忠恒",
    ],
  },
  {
    date: "2026-10-31",
    title: "功能調整",
    features: ["調整卡牌回報選項"],
  },
  {
    date: "2026-10-30",
    title: "功能更新",
    features: ["新增卡牌回報", "新增更新日誌"],
  },
  {
    date: "2026-10-29",
    title: "更新以下武將資料",
    cards: ["徳川光圀"],
  },
  {
    date: "2026-10-28",
    title: "新增以下武將資料",
    cards: ["徳川光圀", "細川幽斎"],
  },
  {
    date: "2026-10-21",
    title: "遊戲版本更新",
    features: ["更新至 Ver.3.5.0K", "更新相關武將資料"],
  },
];
