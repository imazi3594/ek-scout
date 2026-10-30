/** Card report → Google Apps Script Web App → Google Sheet.
 *  Uses text/plain + no-cors so the browser skips CORS preflight
 *  (Apps Script /exec does not send usable CORS headers for Authorization/json). */

export const REPORT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzUgClMBUU6glZE_yIjuXdRuYlNrSltVhYOVw51dDhsKJZCBR3ArGImFxOCaZjXKA8b/exec";

export const REPORT_REASONS = ["翻譯有誤／不通順", "資料有誤"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type CardReportPayload = {
  卡號: string;
  武將名: string;
  原因: ReportReason;
};

export async function submitCardReport(payload: CardReportPayload): Promise<void> {
  const body = {
    卡號: payload.卡號,
    武將名: payload.武將名,
    原因: payload.原因,
  };

  // no-cors → opaque response; treat network completion as success.
  await fetch(REPORT_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
}
