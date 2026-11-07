import { QueryProvider } from "@/lib/providers/query-provider";
import { MonitoringProvider } from "@/lib/providers/monitoring-provider";
import { SWRProvider } from "@/lib/providers/swr-config";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

import { AppShell } from "@/components/app-shell";
import { getPageSession } from "@/lib/server/page-session";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getPageSession();
  return (
    <MonitoringProvider>
      <QueryProvider>
        <SWRProvider>
          <ServiceWorkerRegistration />
          <AppShell user={user}>{children}</AppShell>
        </SWRProvider>
      </QueryProvider>
    </MonitoringProvider>
  );
}
