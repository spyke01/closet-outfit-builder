import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { WardrobePageClient } from "@/app/(app)/wardrobe/wardrobe-page-client";
import Today from "@/app/(app)/today/today-page-client";
import { OutfitsPageClient } from "@/app/(app)/outfits/outfits-page-client";
import { CalendarPageClient } from "@/app/(app)/calendar/calendar-page-client";
import { TripsPageClient } from "@/app/(app)/calendar/trips/trips-page-client";
import { AddItemPageClient } from "@/app/(app)/wardrobe/items/add-item-client";
import { ItemDetailPageClient } from "@/app/(app)/wardrobe/items/[id]/item-detail-client";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { OnboardingExperience } from "@/components/onboarding/onboarding-experience";
import { PlannerUpcoming } from "@/components/planner-upcoming";
import { ExportShareClient } from "@/components/export/export-share-client";
import { items, categories, user, analytics, outfits, weather } from "./fixtures";
import { useVersion, changed } from "./runtime";
const originalFetch = window.fetch.bind(window);
let lastReply = "";
window.fetch = async (input, options) => {
  const url = String(input);
  if (!url.startsWith("/api/") && !url.startsWith("/.netlify/"))
    return originalFetch(
      url === "/clothing-image-options.json"
        ? "./build/clothing-image-options.json"
        : input,
      options,
    );
  let data = { session: null };
  if (url.startsWith("/api/today/"))
    data = {
      todayAiOutfit: null,
      usage: { trialUsed: 0, trialLimit: 1, monthlyUsed: 0, monthlyLimit: 7 },
      options: {
        eventPresets: ["Work Day", "Date Night"],
        stylePresets: ["Smart Casual", "Minimal"],
      },
    };
  if (url === "/api/assistant/chat") {
    const body = JSON.parse(options.body);
    lastReply =
      "Try a lighter layer with the pieces you own. This is a synthetic fixture reply.";
    data = {
      threadId: body.threadId || "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      assistantMessage: lastReply,
    };
  }
  if (url.startsWith("/api/assistant/threads/"))
    data = {
      messages: [
        {
          id: "fixture-reply",
          role: "assistant",
          content: lastReply || "This is a synthetic fixture conversation.",
        },
      ],
    };
  if (url === "/api/onboarding/wardrobe") {
    const body = JSON.parse(options.body);
    data = { success: body.items.length, failed: 0, errors: [] };
    for (const input of body.items)
      items.push({
        ...input,
        id: crypto.randomUUID(),
        category: categories.find(
          (category) => category.id === input.category_id,
        ),
      });
    changed();
  }
  if (url === "/api/upload-image") {
    const file = options.body.get("image");
    data = {
      success: true,
      imageUrl: URL.createObjectURL(file),
      originalImageUrl: URL.createObjectURL(file),
      preparedImageUrl: "/images/wardrobe/ocbd-blue.png",
      bgRemovalStatus: "completed",
    };
  }
  if (url === "/api/wardrobe/suggest-details")
    data = {
      suggestion: {
        name: "Blue Oxford shirt",
        category_id: categories.find((category) => category.name === "Shirt")
          .id,
        color: "blue",
      },
    };
  if (url.startsWith("/api/weather")) data = weather;
  if (url.startsWith("/api/geocode"))
    data = {
      best: { label: "Chicago, IL", name: "Chicago", lat: 41.8, lon: -87.6 },
    };
  if (url.startsWith("/.netlify/"))
    data = { current: { temperature: 58 }, forecast: [] };
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
document.documentElement.dataset.theme =
  localStorage.getItem("fixture-theme") || "dark";
document.documentElement.classList.toggle(
  "dark",
  (localStorage.getItem("fixture-theme") || "dark") === "dark",
);
function FixtureApp() {
  useVersion();
  const path = new URL(location.href).searchParams.get("screen") || "/today";
  const screens = {
    "/today": <Today wardrobeItems={items} userName="Alex" />,
    "/wardrobe": <WardrobePageClient />,
    "/outfits": <OutfitsPageClient />,
    "/calendar": <CalendarPageClient wardrobeItems={items} />,
    "/calendar/upcoming": <PlannerUpcoming />,
    "/calendar/trips": <TripsPageClient wardrobeItems={items} />,
    "/wardrobe/items": <AddItemPageClient />,
    "/onboarding": <OnboardingExperience />,
    "/analytics": <AnalyticsDashboard data={analytics()} />,
    "/export": <ExportShareClient tier="pro" outfits={outfits} />,
  };
  return (
    <AppShell user={user}>
      {screens[path] ||
        (path.startsWith("/wardrobe/items/") ? (
          <ItemDetailPageClient itemId={path.split("/").at(-1)} />
        ) : (
          <div className="page-shell-content">
            <h1>Fixture boundary</h1>
            <p>This utility page remains available in the real application.</p>
          </div>
        ))}
    </AppShell>
  );
}
const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={client}>
    <div className="fixture-label">
      REAL COMPONENTS · Synthetic data · No backend or paid AI connection
    </div>
    <FixtureApp />
  </QueryClientProvider>,
);
