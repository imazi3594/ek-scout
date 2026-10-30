export type ChangelogEntry = {
  date: string;
  title: string;
  features?: string[];
  cards?: string[];
};

/** 更新日誌：只寫做過乜／武將名，唔寫技術細節。新發佈時在陣列最前追加。 */
export const CHANGELOG: ChangelogEntry[] = [
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
