export type ResumeDownloadInfo = {
  url: string;
  fileName: string;
};

export type WhatsAppShareOutcome = "shared_with_file" | "opened_wa_downloaded_resume" | "opened_wa_no_resume";

/** Opens WhatsApp with prefilled text; attaches resume via Web Share when supported. */
export async function shareApplicationViaWhatsApp(
  waUrl: string,
  message: string,
  resume: ResumeDownloadInfo | null
): Promise<WhatsAppShareOutcome> {
  if (resume) {
    try {
      const res = await fetch(resume.url);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], resume.fileName || "resume.pdf", {
          type: blob.type || "application/pdf",
        });
        const shareData: ShareData = { text: message, files: [file] };
        if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
          return "shared_with_file";
        }
      }
    } catch {
      /* fall through to wa.me + download */
    }

    window.open(waUrl, "_blank", "noopener,noreferrer");
    const anchor = document.createElement("a");
    anchor.href = resume.url;
    anchor.download = resume.fileName || "resume.pdf";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return "opened_wa_downloaded_resume";
  }

  window.open(waUrl, "_blank", "noopener,noreferrer");
  return "opened_wa_no_resume";
}
