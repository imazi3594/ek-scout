/** Card report → Cursor automation webhook → Google Sheet.
 *  URL and key are public in this SPA; accepted for low-volume reports. */

export const REPORT_WEBHOOK_URL =
  "https://api2.cursor.sh/automations/webhook/5fecbb70-81e3-5a82-bf2b-7aa5647bcc53";

export const REPORT_WEBHOOK_KEY =
  "crsr_361a32a334275a997f3eb9fb893a450b1f8139a43a7add74aca933f64580aa5c";

export const REPORT_REASONS = ["翻譯唔通順", "資料有誤"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type CardReportPayload = {
  卡號: string;
  武將名: string;
  原因: ReportReason;
};

export async function submitCardReport(payload: CardReportPayload): Promise<void> {
  const body: Record<string, string> = {
    卡號: payload.卡號,
    武將名: payload.武將名,
    原因: payload.原因,
  };

  const res = await fetch(REPORT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPORT_WEBHOOK_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `回報失敗（HTTP ${res.status}）`);
  }
}
