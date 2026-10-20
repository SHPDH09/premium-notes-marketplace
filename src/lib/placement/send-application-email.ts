import nodemailer from "nodemailer";
import { downloadStoredFile } from "@/lib/storage";

export async function sendApplicationEmail(params: {
  fromEmail: string;
  appPassword: string;
  to: string;
  subject: string;
  body: string;
  resumeBuffer?: Buffer | null;
  resumeFileName?: string | null;
}) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: params.fromEmail,
      pass: params.appPassword,
    },
  });

  const attachments =
    params.resumeBuffer && params.resumeBuffer.length > 0
      ? [
          {
            filename: params.resumeFileName ?? "resume.pdf",
            content: params.resumeBuffer,
            contentType: "application/pdf",
          },
        ]
      : [];

  await transporter.sendMail({
    from: params.fromEmail,
    to: params.to,
    subject: params.subject,
    text: params.body,
    attachments,
  });
}

export async function loadResumeBuffer(storageKey: string | null | undefined) {
  if (!storageKey) return null;
  return downloadStoredFile(storageKey);
}
