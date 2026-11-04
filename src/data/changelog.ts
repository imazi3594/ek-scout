export type ChangelogEntry = {
  date: string;
  title: string;
  features?: string[];
  cards?: string[];
};

/** 更新日誌：改卡只寫「修改部份卡片資料」（同日一次）；加新卡先列武將名。唔寫技術細節。 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-05",
    title: "新增武將 昌平君、地獄太夫",
  },
  {
    date: "2026-11-04",
    title: "修改部份卡片資料",
  },
  {
    date: "2026-11-01",
    title: "修改部份卡片資料",
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
    title: "修改部份卡片資料",
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
