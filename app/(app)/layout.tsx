import { QueryProvider } from "@/lib/providers/query-provider";
import { MonitoringProvider } from "@/lib/providers/monitoring-provider";
import { SWRProvider } from "@/lib/providers/swr-config";
import { PreloadInitializer } from "@/components/preload-initializer";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MonitoringProvider>
      <QueryProvider>
        <SWRProvider>
          <PreloadInitializer />
          <ServiceWorkerRegistration />
          {children}
        </SWRProvider>
      </QueryProvider>
    </MonitoringProvider>
  );
}
