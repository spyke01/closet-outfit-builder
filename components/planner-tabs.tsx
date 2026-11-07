import { NavigationLink } from "@/components/navigation-link";

export function PlannerTabs({
  active,
}: {
  active: "upcoming" | "calendar" | "trips";
}) {
  return (
    <nav aria-label="Planner views" className="planner-tabs">
      <NavigationLink label="Upcoming plans"
        href="/calendar/upcoming"
        aria-current={active === "upcoming" ? "page" : undefined}
      >
        Upcoming
      </NavigationLink>
      <NavigationLink label="Calendar"
        href="/calendar"
        aria-current={active === "calendar" ? "page" : undefined}
      >
        Calendar
      </NavigationLink>
      <NavigationLink label="Trips & packing"
        href="/calendar/trips"
        aria-current={active === "trips" ? "page" : undefined}
      >
        Trips & packing
      </NavigationLink>
    </nav>
  );
}
