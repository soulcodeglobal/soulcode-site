// netlify/functions/report-lead.js
//
// 免費版 → 詳細報告 email gate → MailerLite「深度報告 Leads」group
// 前端 POST { email, soul_core, adolescent, language } 過嚟，
// 寫入 soul_core / adolescent / language 三個 custom field，並加入「深度報告 Leads」group。
// MailerLite automation（trigger = 加入呢個 group）會自動寄一封含詳細報告連結的 email：
//   https://soulcodeglobal.com/report.html?sc={$fields.soul_core}&ad={$fields.adolescent}&lang={$fields.language}
//
// 需要嘅 Netlify 環境變數：
//   MAILERLITE_API_KEY       （已有）
//   MAILERLITE_GROUP_REPORT  「深度報告 Leads」group 的 ID（新增）
//
// 注意：前端即使呢個 function 失敗都會照樣轉去 report.html（即時開啟報告），
//       所以呢度只負責入 CRM，唔阻用戶睇報告。
//
// 部署後 endpoint：https://soulcodeglobal.com/.netlify/functions/report-lead

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const key = process.env.MAILERLITE_API_KEY;
  const group = process.env.MAILERLITE_GROUP_REPORT;
  if (!key) { console.error("Missing MAILERLITE_API_KEY"); return resp(500, { error: "Not configured" }); }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return resp(400, { error: "Bad JSON" }); }

  const email = String(body.email || "").trim().toLowerCase();
  const soul = String(body.soul_core || "").trim();
  const ado = String(body.adolescent || "").trim();
  const rawLang = String(body.language || "").trim().toLowerCase();
  const language = rawLang === "en" ? "en" : (rawLang ? "zh" : "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return resp(400, { error: "Invalid email" });

  const payload = { email, status: "active", fields: {} };
  if (soul) payload.fields.soul_core = soul;
  if (ado)  payload.fields.adolescent = ado;
  if (language) payload.fields.language = language;
  if (group) payload.groups = [group];

  try {
    const r = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("MailerLite report-lead error", r.status, await r.text());
      return resp(502, { error: "Subscribe failed" });
    }
    return resp(200, { ok: true });
  } catch (e) {
    console.error(e);
    return resp(500, { error: "Server error" });
  }
};

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(obj),
  };
}
