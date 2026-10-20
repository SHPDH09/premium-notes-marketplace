import { brand } from "@/config/brand";

export type ReminderDay = 3 | 2 | 1;

function formatEndDate(endsAt: Date): string {
  return endsAt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function renewUrl(): string {
  return `${brand.website}/profile/placement`;
}

function copyForDay(daysLeft: ReminderDay, planName: string, endLabel: string) {
  switch (daysLeft) {
    case 3:
      return {
        subject: `Your ${planName} placement access ends in 3 days`,
        headline: "A quick heads-up about your placement plan",
        intro: `Hi there — your **${planName}** subscription on ${brand.name} is set to end on **${endLabel}** (3 days from now).`,
        body: `You still have time to renew and keep applying to jobs, using AI application emails, and your placement profile without interruption.`,
        cta: "Review plans & renew",
        urgency: "Early renewal takes less than a minute.",
      };
    case 2:
      return {
        subject: `2 days left on your ${planName} placement plan`,
        headline: "Your placement access is winding down",
        intro: `Just a friendly reminder — your **${planName}** plan expires on **${endLabel}** (2 days left).`,
        body: `Don't lose momentum on applications you've started. Renew now so job apply, resume tools, and Gmail send stay active.`,
        cta: "Renew my subscription",
        urgency: "Students who renew early don't miss new job postings.",
      };
    case 1:
      return {
        subject: `Last day tomorrow — renew ${planName} to keep applying`,
        headline: "Final reminder before your plan ends",
        intro: `This is an important reminder — your **${planName}** subscription ends **tomorrow (${endLabel})**.`,
        body: `After expiry, you won't be able to apply to new placement jobs until you subscribe again. Take a moment to renew today.`,
        cta: "Renew before it expires",
        urgency: "Last chance to renew without a gap in access.",
      };
  }
}

export function buildSubscriptionReminderEmail(params: {
  studentName: string;
  planName: string;
  endsAt: Date;
  daysLeft: ReminderDay;
}) {
  const endLabel = formatEndDate(params.endsAt);
  const copy = copyForDay(params.daysLeft, params.planName, endLabel);
  const link = renewUrl();
  const firstName = params.studentName.trim().split(/\s+/)[0] || "there";

  const text = [
    `Hi ${firstName},`,
    "",
    copy.intro.replace(/\*\*/g, ""),
    "",
    copy.body,
    "",
    `${copy.urgency}`,
    "",
    `${copy.cta}: ${link}`,
    "",
    `— ${brand.name} Placement Team`,
    brand.supportEmail,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#312e81,#4338ca,#0ea5e9);padding:28px 32px;color:#fff;">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">${brand.name} Placement</p>
              <h1 style="margin:12px 0 0;font-size:22px;line-height:1.35;font-weight:700;">${copy.headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#334155;font-size:16px;line-height:1.65;">
              <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(firstName)}</strong>,</p>
              <p style="margin:0 0 16px;">${markdownBoldToHtmlFixed(copy.intro)}</p>
              <p style="margin:0 0 20px;">${copy.body}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#64748b;">Plan</p>
                    <p style="margin:4px 0 0;font-size:17px;font-weight:600;color:#0f172a;">${escapeHtml(params.planName)}</p>
                    <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Expires</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#b45309;">${escapeHtml(endLabel)} · ${params.daysLeft} day${params.daysLeft > 1 ? "s" : ""} left</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;">${copy.urgency}</p>
              <a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:12px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">${copy.cta} →</a>
              <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;">Or copy this link:<br><a href="${link}" style="color:#6366f1;word-break:break-all;">${link}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
              ${brand.name} · ${brand.supportEmail}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: copy.subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownBoldToHtmlFixed(s: string): string {
  const parts = s.split(/\*\*/);
  return parts
    .map((part, i) => (i % 2 === 1 ? `<strong>${escapeHtml(part)}</strong>` : escapeHtml(part)))
    .join("");
}
