export type ChangelogEntry = {
  date: string;
  title: string;
  features?: string[];
  cards?: string[];
};

/** 更新日誌：重大功能與卡牌資料變更。新發佈時在陣列最前追加。 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-30",
    title: "卡牌回報改走 Apps Script",
    features: [
      "卡牌回報：原因三選一（翻譯有誤／不通順、資料有誤、介面顯示混亂），寫入 Google Sheet",
      "回報後端改 Apps Script Web App，修瀏覽器 CORS／Failed to fetch",
      "關於頁顯示 App 版本與版本更新日期",
      "新增獨立「更新日誌」頁",
    ],
  },
  {
    date: "2026-10-29",
    title: "補第7回ショップ第二段效果資料",
    features: ["對齊 eiketsudb：補傷害表／計略效果描述"],
    cards: ["EX221 徳川光圀"],
  },
  {
    date: "2026-10-28",
    title: "第7回ポイントショップ第二段",
    features: ["新增第7回ショップ第二段武將資料"],
    cards: ["EX221 徳川光圀", "EX222 細川幽斎"],
  },
  {
    date: "2026-10-21",
    title: "Ver.3.5.0K 資料更新",
    features: [
      "遊戲版本更新至 Ver.3.5.0K（第６彈 古幻相剋の八象）",
      "新卡、調整卡與 errata 資料概括更新",
    ],
  },
];
