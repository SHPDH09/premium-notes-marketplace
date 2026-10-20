import nodemailer from "nodemailer";
import { brand } from "@/config/brand";

export function isPlatformEmailConfigured(): boolean {
  return !!(process.env.PLATFORM_SMTP_EMAIL?.trim() && process.env.PLATFORM_SMTP_APP_PASSWORD?.trim());
}

export async function sendPlatformEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const user = process.env.PLATFORM_SMTP_EMAIL?.trim();
  const pass = process.env.PLATFORM_SMTP_APP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error("Platform SMTP is not configured (PLATFORM_SMTP_EMAIL / PLATFORM_SMTP_APP_PASSWORD).");
  }

  const host = process.env.PLATFORM_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.PLATFORM_SMTP_PORT ?? 587);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const fromName = process.env.PLATFORM_SMTP_FROM_NAME?.trim() || brand.name;

  await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    replyTo: brand.supportEmail,
  });
}
