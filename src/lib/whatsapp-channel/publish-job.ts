import { brand } from "@/config/brand";
import { isJobLiveOnPublicBoard } from "@/lib/placement/job-board-visible";
import { generateWhatsAppJobMessage } from "@/lib/placement/generate-whatsapp-job-message";
import { prisma } from "@/lib/db";
import { getWhatsAppChannelConfig } from "@/lib/whatsapp-channel/settings";
import { wapioSendChannelMessage } from "@/lib/whatsapp-channel/wapio-provider";

export type PublishJobWhatsAppResult =
  | { skipped: true; reason: string }
  | { ok: true; alreadyPosted: boolean }
  | { ok: false; error: string };

export async function publishJobToWhatsAppChannel(jobId: string): Promise<PublishJobWhatsAppResult> {
  const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
  if (!job) {
    return { skipped: true, reason: "Job not found" };
  }
  if (!isJobLiveOnPublicBoard(job)) {
    return { skipped: true, reason: "Job is not published on the placement board" };
  }

  const config = await getWhatsAppChannelConfig();
  if (!config) {
    return { skipped: true, reason: "WhatsApp Channel integration disabled or incomplete" };
  }

  const existing = await prisma.jobWhatsAppChannelPost.findUnique({ where: { jobId } });
  if (existing?.status === "SUCCESS") {
    return { ok: true, alreadyPosted: true };
  }

  const postRow = existing
    ? await prisma.jobWhatsAppChannelPost.update({
        where: { id: existing.id },
        data: { status: "PENDING", provider: config.provider, errorMessage: null },
      })
    : await prisma.jobWhatsAppChannelPost.create({
        data: {
          jobId,
          status: "PENDING",
          provider: config.provider,
        },
      });

  const { message } = await generateWhatsAppJobMessage(job, brand.website);

  let sendResult: Awaited<ReturnType<typeof wapioSendChannelMessage>>;
  if (config.provider === "wapio") {
    sendResult = await wapioSendChannelMessage({
      apiBaseUrl: config.apiBaseUrl,
      apiKey: config.apiKey,
      channelId: config.channelId,
      text: message,
      idempotencyKey: `tl-job-${jobId}`,
    });
  } else {
    await prisma.jobWhatsAppChannelPost.update({
      where: { id: postRow.id },
      data: { status: "FAILED", errorMessage: `Unsupported provider: ${config.provider}` },
    });
    return { ok: false, error: `Unsupported provider: ${config.provider}` };
  }

  if (!sendResult.ok) {
    await prisma.jobWhatsAppChannelPost.update({
      where: { id: postRow.id },
      data: { status: "FAILED", errorMessage: sendResult.error },
    });
    return { ok: false, error: sendResult.error };
  }

  await prisma.jobWhatsAppChannelPost.update({
    where: { id: postRow.id },
    data: {
      status: "SUCCESS",
      errorMessage: null,
      postedAt: new Date(),
    },
  });

  return { ok: true, alreadyPosted: false };
}

/** Fire-and-forget wrapper — never throws to caller. */
export function scheduleWhatsAppChannelPublish(jobId: string) {
  void publishJobToWhatsAppChannel(jobId).catch((e) => {
    console.error("WhatsApp channel publish error", jobId, e);
  });
}

export function serializeWhatsAppPost(
  post: {
    status: string;
    errorMessage: string | null;
    postedAt: Date | null;
    updatedAt: Date;
  } | null
) {
  if (!post) return null;
  return {
    status: post.status,
    errorMessage: post.errorMessage,
    postedAt: post.postedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
  };
}
