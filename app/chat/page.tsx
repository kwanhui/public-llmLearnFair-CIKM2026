import { resolveCohortFromRequest } from "@/lib/cohort/resolve";
import { DEFAULT_COHORT_CONFIG } from "@/lib/cohort/defaults";
import { ChatClient } from "@/components/chat/chat-client";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const resolved = await resolveCohortFromRequest().catch(() => null);
  const config = resolved?.config ?? DEFAULT_COHORT_CONFIG;
  return <ChatClient cohortName={resolved?.cohortName ?? null} config={config} />;
}
