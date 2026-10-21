import { NextResponse } from "next/server";
import { withAdminJson } from "@/lib/api/admin-route";
import { publishJobToWhatsAppChannel, serializeWhatsAppPost } from "@/lib/whatsapp-channel/publish-job";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withAdminJson(async () => {
    const job = await prisma.jobPosting.findUnique({ where: { id: params.id } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const existing = await prisma.jobWhatsAppChannelPost.findUnique({ where: { jobId: params.id } });
    if (existing?.status === "SUCCESS") {
      return NextResponse.json({
        ok: true,
        alreadyPosted: true,
        post: serializeWhatsAppPost(existing),
      });
    }

    const result = await publishJobToWhatsAppChannel(params.id);
    const post = await prisma.jobWhatsAppChannelPost.findUnique({ where: { jobId: params.id } });

    if ("skipped" in result) {
      return NextResponse.json({ ok: false, skipped: true, reason: result.reason, post: serializeWhatsAppPost(post) });
    }
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, post: serializeWhatsAppPost(post) }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      alreadyPosted: result.alreadyPosted,
      post: serializeWhatsAppPost(post),
    });
  });
}
