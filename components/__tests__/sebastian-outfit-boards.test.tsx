import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { SebastianOutfitBoards } from "../sebastian-outfit-boards";
import { createOutfit } from "@/lib/actions/outfits";
import type { AssistantOutfitBoard } from "@/lib/types/assistant-outfit";

vi.mock("@/lib/actions/outfits", () => ({ createOutfit: vi.fn() }));
const board: AssistantOutfitBoard = { id: "board-1", title: "Everyday layers", focusItemId: "chinos", items: ["Chinos", "Shirt", "Shoes", "Coat", "Belt", "Watch", "Undershirt"].map((name) => ({ id: name.toLowerCase(), name, color: "olive", category: name, categoryId: `${name}-category`, imageUrl: `/photos/${name}.jpg` })) };
function show(onDiscuss = vi.fn()) {
  render(<QueryClientProvider client={new QueryClient()}><SebastianOutfitBoards boards={[board]} onDiscuss={onDiscuss} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "View Everyday layers" }));
  return onDiscuss;
}
describe("Sebastian wardrobe photo boards", () => {
  it("shows every owned piece and passes a precise swapped combination back to the conversation", async () => {
    const onDiscuss = show();
    expect(within(screen.getByRole("dialog", { name: "Everyday layers" })).getAllByRole("article")).toHaveLength(7);
    const replacement = { ...board.items[1], id: "white-shirt", name: "Oxford", color: "white", imageUrl: "/photos/white-shirt.jpg" };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ items: [board.items[1], replacement], hasMore: false }) } as Response);
    fireEvent.click(screen.getByRole("button", { name: "Swap Olive Shirt" }));
    fireEvent.click(await screen.findByRole("button", { name: "Use White Oxford" }));
    expect(screen.queryByRole("dialog", { name: "Swap Olive Shirt" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: "Everyday layers" })).getByRole("img", { name: "White Oxford" })).toHaveAttribute("src", "/photos/white-shirt.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Discuss this look" }));
    expect(onDiscuss).toHaveBeenCalledWith(expect.objectContaining({ focusItemId: "chinos", items: expect.arrayContaining([expect.objectContaining({ id: "white-shirt" })]) }));
    expect(onDiscuss.mock.calls[0][0].items).toHaveLength(7);
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).startsWith("/api/assistant/wardrobe-options?"))).toBe(true);
  });
  it("saves all exact selected IDs only after an explicit Save and shows the saved outfit", async () => {
    vi.mocked(createOutfit).mockResolvedValue({ success: true, data: { id: "saved-outfit" } } as Awaited<ReturnType<typeof createOutfit>>);
    show(); expect(createOutfit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save outfit" }));
    expect(await screen.findByRole("link", { name: "Open saved outfit" })).toHaveAttribute("href", "/outfits/saved-outfit");
    expect(createOutfit).toHaveBeenCalledExactlyOnceWith({ name: board.title, items: board.items.map((item) => item.id), source: "generated" });
  });
  it("retains the board after a failed save and offers retry", async () => {
    vi.mocked(createOutfit).mockResolvedValue({ success: false, error: "Unavailable" });
    show(); fireEvent.click(screen.getByRole("button", { name: "Save outfit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your swaps are still here");
    expect(within(screen.getByRole("dialog", { name: "Everyday layers" })).getAllByRole("article")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Save outfit" })).not.toBeDisabled();
  });
});
