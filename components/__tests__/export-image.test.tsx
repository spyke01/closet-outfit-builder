import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportShareClient } from "../export/export-share-client";
import type { WardrobeItem } from "@/lib/types/database";
const state = vi.hoisted(() => ({ toBlob: vi.fn(), share: vi.fn() }));
vi.mock("html-to-image", () => ({ toBlob: state.toBlob }));
const pieces = [
  "Shirt",
  "Pants",
  "Shoes",
  "Coat",
  "Belt",
  "Watch",
  "Undershirt",
].map((name, index) => ({
  id: String(index),
  name: "My " + name,
  category: { name },
  image_url: "/piece.png",
})) as WardrobeItem[];
const outfits = [
  { id: "owned-outfit", name: "Office layers", score: 90, items: pieces },
];
beforeEach(() => {
  vi.clearAllMocks();
  state.toBlob.mockResolvedValue(
    new Blob(["fixture-png"], { type: "image/png" }),
  );
  state.share.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { canShare: () => true, share: state.share });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("outfit image exports", () => {
  it("includes every clothing piece and shares an image file", async () => {
    render(<ExportShareClient tier="pro" outfits={outfits} />);
    for (const piece of pieces)
      expect(screen.getByRole("img", { name: piece.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share image" }));
    await waitFor(() => expect(state.share).toHaveBeenCalledOnce());
    expect(state.toBlob.mock.calls[0][0].textContent).toContain("My Watch");
    const shared = state.share.mock.calls[0][0];
    expect(shared.files[0]).toBeInstanceOf(File);
    expect(shared.files[0].type).toBe("image/png");
    expect(shared.url).toBeUndefined();
  });
  it("retains the Pro gate and reports renderer failures without a text-only fallback", async () => {
    const view = render(<ExportShareClient tier="plus" outfits={outfits} />);
    expect(screen.getByRole("link", { name: "Explore Pro" })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
    expect(
      screen.queryByRole("button", { name: "Export as image" }),
    ).not.toBeInTheDocument();
    view.rerender(<ExportShareClient tier="pro" outfits={outfits} />);
    state.toBlob.mockRejectedValueOnce(new Error("render failure"));
    fireEvent.click(screen.getByRole("button", { name: "Export as image" }));
    await screen.findByText(
      "Could not create the outfit image. Please try again.",
    );
    expect(state.share).not.toHaveBeenCalled();
  });
});
