import { getCrmSession } from "@/lib/crm/auth";
import { InboxWorkspace } from "@/components/crm/inbox-workspace";

export default async function CrmInboxPage({
  searchParams,
}: {
  searchParams: { conversation?: string };
}) {
  const session = await getCrmSession();
  const isAdmin =
    session?.role === "COMPANY_ADMIN" || session?.memberRole === "COMPANY_ADMIN";

  return (
    <InboxWorkspace
      memberId={session?.memberId}
      initialConversationId={searchParams.conversation ?? undefined}
      isAdmin={!!isAdmin}
    />
  );
}
