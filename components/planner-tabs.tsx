import Link from "next/link";

export function PlannerTabs({
  active,
}: {
  active: "upcoming" | "calendar" | "trips";
}) {
  return (
    <nav aria-label="Planner views" className="planner-tabs">
      <Link
        href="/calendar/upcoming"
        aria-current={active === "upcoming" ? "page" : undefined}
      >
        Upcoming
      </Link>
      <Link
        href="/calendar"
        aria-current={active === "calendar" ? "page" : undefined}
      >
        Calendar
      </Link>
      <Link
        href="/calendar/trips"
        aria-current={active === "trips" ? "page" : undefined}
      >
        Trips & packing
      </Link>
    </nav>
  );
}
