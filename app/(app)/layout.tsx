import { QueryProvider } from "@/lib/providers/query-provider";
import { MonitoringProvider } from "@/lib/providers/monitoring-provider";
import { SWRProvider } from "@/lib/providers/swr-config";
import { PreloadInitializer } from "@/components/preload-initializer";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MonitoringProvider>
      <QueryProvider>
        <SWRProvider>
          <PreloadInitializer />
          <ServiceWorkerRegistration />
          <AppShell user={user}>{children}</AppShell>
        </SWRProvider>
      </QueryProvider>
    </MonitoringProvider>
  );
}
