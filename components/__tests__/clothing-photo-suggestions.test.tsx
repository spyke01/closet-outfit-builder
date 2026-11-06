import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClothingPhotoSuggestions } from "../clothing-photo-suggestions";
const mocks = vi.hoisted(() => ({ paid: true }));
vi.mock("@/lib/hooks/use-billing-entitlements", () => ({
  useBillingEntitlements: () => ({
    loading: false,
    entitlements: { isPaid: mocks.paid },
  }),
}));
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  mocks.paid = true;
  sessionStorage.clear();
  vi.mocked(fetch).mockReset();
});
afterEach(cleanup);
describe("photo detail suggestions", () => {
  it("starts only on request and requires review before applying fields", async () => {
    const onApply = vi.fn();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestion: { name: "Blue shirt", category_id: id, color: "blue" },
        }),
      ),
    );
    render(
      <ClothingPhotoSuggestions
        imageUrl="/api/clothing-images/owner/original.png"
        categories={[{ id, name: "Shirt" }]}
        onApply={onApply}
      />,
    );
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Suggest details from this photo" }),
    );
    await screen.findByText("Blue shirt");
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Apply suggested details" }),
    );
    expect(onApply).toHaveBeenCalledWith({
      name: "Blue shirt",
      category_id: id,
      color: "blue",
    });
  });
  it("offers the existing membership path for a free account without an inference control", () => {
    mocks.paid = false;
    render(
      <ClothingPhotoSuggestions
        imageUrl="/owned.png"
        categories={[]}
        onApply={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Explore Plus and Pro/ }),
    ).toHaveAttribute("href", "/settings/billing");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
