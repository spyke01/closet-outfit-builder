// Synthetic data only. The fixture build never imports real service credentials.
export const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "alex@example.test",
  user_metadata: { first_name: "Alex" },
};
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const categories = [
  "Shirt",
  "Pants",
  "Shoes",
  "Jacket",
  "Undershirt",
  "Belt",
  "Watch",
  "Dress",
].map((name, i) => ({
  id: uuid(i + 1),
  user_id: user.id,
  name,
  is_anchor_item: ["Shirt", "Jacket", "Dress"].includes(name),
  display_order: i,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
}));
const catalog = [
  ["Blue Oxford shirt", "ocbd-blue", "Shirt", "blue", 6],
  ["White Oxford shirt", "ocbd-white", "Shirt", "white", 7],
  ["Navy polo", "polo-navy", "Shirt", "navy", 4],
  ["White tee", "tee-white", "Shirt", "white", 2],
  ["Olive chinos", "chinos-olive", "Pants", "olive", 5],
  ["Navy chinos", "chino-navy", "Pants", "navy", 6],
  ["Khaki chinos", "chino-khaki", "Pants", "khaki", 4],
  ["Classic jeans", "jean-medium", "Pants", "blue", 3],
  ["White sneakers", "sneakers-white-leather", "Shoes", "white", 3],
  ["Suede loafers", "loafers-tan-suede", "Shoes", "tan", 7],
  ["Grey cardigan", "cardigan-grey", "Jacket", "grey", 5],
  ["Tweed sport coat", "sportcoat-tweed-brown", "Jacket", "brown", 8],
  ["Brown belt", "belt-reversible", "Belt", "brown", 5],
  ["Classic watch", "rolex-cellini-moonphase", "Watch", "brown", 6],
  ["White undershirt", "tee-white", "Undershirt", "white", 2],
];
const baseItems = catalog.map(([name, img, cat, color, formality], i) => ({
  id: uuid(i + 20),
  user_id: user.id,
  name,
  brand: "Sample brand",
  category_id: categories.find((c) => c.name === cat).id,
  category: categories.find((c) => c.name === cat),
  color,
  material: "Cotton",
  formality_score: formality,
  capsule_tags: ["Refined"],
  season: ["All"],
  image_url: `/images/wardrobe/${img}.png`,
  purchase_price: i % 3 ? null : 40 + i * 5,
  purchase_currency: i === 3 ? "EUR" : "USD",
  active: true,
  bg_removal_status: "completed",
  created_at: "2026-11-01",
  updated_at: "2026-11-01",
}));
export const items =
  JSON.parse(localStorage.getItem("experience-fixture-items") || "null") ||
  baseItems;
const baseOutfits = Array.from({ length: 6 }, (_, i) => ({
  id: uuid(i + 50),
  user_id: user.id,
  name: [
    "Office casual",
    "Weekend favorites",
    "Dinner out",
    "Simple layers",
    "Everyday blues",
    "Friday outfit",
  ][i],
  items: [
    items[i % 4],
    items[4 + (i % 4)],
    items[8 + (i % 2)],
    ...(i === 0 ? [items[10], items[12], items[13], items[14]] : []),
  ],
  score: 85 + i,
  loved: i === 1,
  source: i % 2 ? "generated" : "curated",
  created_at: "2026-11-01",
  updated_at: "2026-11-01",
}));
export const outfits =
  JSON.parse(localStorage.getItem("experience-fixture-outfits") || "null") ||
  baseOutfits;
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const now = new Date();
const baseEntries = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(now);
  date.setDate(date.getDate() - i);
  return {
    id: uuid(i + 70),
    user_id: user.id,
    entry_date: dateKey(date),
    status: i ? "worn" : "planned",
    outfit_id: outfits[i % 6].id,
    outfit: outfits[i % 6],
    items: outfits[i % 6].items,
    notes: i ? "" : "Work then dinner",
    weather_context: null,
    created_at: "2026-11-01",
    updated_at: "2026-11-01",
  };
});
baseEntries.push({
  ...baseEntries[0],
  id: uuid(90),
  outfit_id: outfits[2].id,
  outfit: outfits[2],
  items: outfits[2].items,
});
export const entries =
  JSON.parse(localStorage.getItem("experience-fixture-entries") || "null") ||
  baseEntries;
export const trip = {
  id: uuid(95),
  user_id: user.id,
  name: "A weekend away",
  destination_text: "Chicago",
  destination_lat: 41.8,
  destination_lon: -87.6,
  start_date: dateKey(now),
  end_date: dateKey(new Date(now.getTime() + 2 * 86400000)),
  created_at: "2026-11-01",
  updated_at: "2026-11-01",
};
export const tripsList = JSON.parse(
  localStorage.getItem("experience-fixture-trips") || "null",
) || [trip];
const initialTripDays = Array.from({ length: 3 }, (_, index) => ({
  id: uuid(110 + index),
  trip_id: trip.id,
  day_date: dateKey(new Date(now.getTime() + index * 86400000)),
  slot_number: 1,
  slot_label: "Daytime",
  outfit_id: index < 2 ? outfits[index].id : null,
  outfit: index < 2 ? outfits[index] : null,
  items: index < 2 ? outfits[index].items : [],
}));
initialTripDays.push({
  ...initialTripDays[0],
  id: uuid(115),
  slot_number: 2,
  slot_label: "Evening",
  outfit_id: outfits[2].id,
  outfit: outfits[2],
  items: outfits[2].items,
});
export const tripDays =
  JSON.parse(localStorage.getItem("experience-fixture-trip-days") || "null") ||
  initialTripDays;
export const tripPackItems = JSON.parse(
  localStorage.getItem("experience-fixture-trip-pack") || "null",
) || [
  {
    id: uuid(120),
    trip_id: trip.id,
    wardrobe_item_id: items[0].id,
    label: items[0].name,
    source: "from_outfit",
    packed: true,
  },
  {
    id: uuid(121),
    trip_id: trip.id,
    wardrobe_item_id: null,
    label: "Phone charger",
    source: "manual",
    packed: false,
  },
];
export const weather = {
  current: {
    temperature: 58,
    feelsLike: 56,
    condition: "Partly cloudy",
    icon: "02d",
    humidity: 50,
    windSpeed: 8,
  },
  forecast: Array.from({ length: 5 }, (_, i) => ({
    date: dateKey(new Date(now.getTime() + i * 86400000)),
    temperature: { high: 62 + i, low: 48 + i },
    condition: "Partly cloudy",
    icon: "02d",
    precipitationProbability: 0.2,
  })),
  loading: false,
  error: null,
  retry: () => {},
  usingFallback: false,
  weatherEnabled: true,
  preferenceLoading: false,
  locationLabel: { name: "Chicago", label: "Chicago, IL" },
  timezone: "America/Chicago",
};
export function analytics() {
  return {
    wardrobe: {
      totalItems: items.length,
      totalOutfits: outfits.length,
      recentlyAdded: [],
      mostWorn: [],
    },
    engagement: {
      savedOutfits: outfits.length,
      lovedOutfits: 1,
      outfitHistory: [],
      todayStats: { totalRecommendations: 0, accepted: 0, acceptanceRate: 0 },
    },
    insights: {
      asOf: dateKey(new Date()),
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        imageUrl: item.image_url,
        category: item.category.name,
        active: item.active,
        price: item.purchase_price,
        currency: item.purchase_currency,
        createdAt: item.created_at,
      })),
      wears: entries
        .filter((entry) => entry.status === "worn")
        .map((entry) => ({
          id: entry.id,
          date: entry.entry_date,
          name: entry.outfit?.name || "Your outfit",
          itemIds: entry.items.map((item) => item.id),
        })),
    },
  };
}
