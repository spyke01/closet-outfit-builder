import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { SebastianChatLauncher } from "../sebastian-chat-launcher";
import { openSebastian } from "@/lib/utils/sebastian-events";

vi.mock("@/components/sebastian-avatar", () => ({
  SebastianAvatar: ({ className }: { className?: string }) => (
    <div data-testid="sebastian-avatar" className={className}>
      S
    </div>
  ),
}));

describe("SebastianChatLauncher", () => {
  it("keeps the exact colored piece visible and sends its ID on follow-ups until cleared", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ assistantMessage: "Try a white shirt." }) } as Response);
    render(<SebastianChatLauncher variant="headless" />);
    const piece = { id: "66f778ac-308b-4de3-b674-22104b68da63", name: "Chinos", color: "olive", category: "Pants", material: "Cotton" };
    act(() => openSebastian("Build around my Olive Chinos.", { focusItemId: piece.id }, piece));
    expect(screen.getByRole("region", { name: "Selected clothing piece" })).toHaveTextContent("Olive Chinos (Pants · Cotton)");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Try a white shirt.");
    fireEvent.click(screen.getByRole("button", { name: "Close Ask Sebastian" }));
    act(() => openSebastian());
    expect(screen.getByRole("region", { name: "Selected clothing piece" })).toHaveTextContent("Olive Chinos");
    fireEvent.change(screen.getByRole("textbox", { name: "Message Sebastian" }), { target: { value: "Make it warmer." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    for (const [, init] of fetchMock.mock.calls) {
      const request = JSON.parse(init?.body as string);
      expect(request.contextHints.focusItemId).toBe(piece.id);
      expect(request.imageUrl).toBeUndefined();
    }
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop building around this piece" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Stop building around this piece" }));
    expect(screen.queryByRole("region", { name: "Selected clothing piece" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Message Sebastian" }), { target: { value: "Now help with tomorrow." } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string).contextHints.focusItemId).toBeUndefined();
  });

  it("replaces the old piece when another piece or planner context opens", () => {
    render(<SebastianChatLauncher variant="headless" />);
    const olive = { id: "olive", name: "Chinos", color: "olive" };
    act(() => openSebastian("Build a look", { focusItemId: olive.id }, olive));
    const navy = { id: "navy", name: "Chinos", color: "navy" };
    act(() => openSebastian("Build another look", { focusItemId: navy.id }, navy));
    expect(screen.getByRole("region", { name: "Selected clothing piece" })).toHaveTextContent("Navy Chinos");
    expect(screen.queryByText("Olive Chinos")).not.toBeInTheDocument();
    act(() => openSebastian("Plan Friday", { eventDate: "2026-11-13" }));
    expect(screen.queryByRole("region", { name: "Selected clothing piece" })).not.toBeInTheDocument();
  });

  it("renders floating trigger styles in floating variant", () => {
    render(<SebastianChatLauncher variant="floating" />);

    const button = screen.getByRole("button", { name: "Ask Sebastian" });
    expect(button.className).toContain("fixed");
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("text-primary-foreground");
  });

  it("opens and closes chat dialog from floating trigger", () => {
    render(<SebastianChatLauncher variant="floating" />);

    fireEvent.click(screen.getByRole("button", { name: "Ask Sebastian" }));
    expect(
      screen.getByRole("dialog", { name: "Ask Sebastian" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Close Ask Sebastian" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Ask Sebastian" }),
    ).not.toBeInTheDocument();
  });

  it("shows upgrade overlay in modal when access is restricted", () => {
    render(<SebastianChatLauncher variant="floating" requiresUpgrade />);

    fireEvent.click(screen.getByRole("button", { name: "Ask Sebastian" }));
    expect(
      screen.getByText("Talk through what to wear"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Compare Plus & Pro" }),
    ).toHaveAttribute("href", "/settings/billing");
  });

  it("waits for membership verification before showing an upgrade prompt", () => {
    render(<SebastianChatLauncher requiresUpgrade membershipPending />);
    fireEvent.click(screen.getByRole('button', {name:'Ask Sebastian'}));
    expect(screen.getByRole('status')).toHaveTextContent('Loading your membership');
    expect(screen.queryByRole('link', {name:'Compare Plus & Pro'})).not.toBeInTheDocument();
  });

  it("offers a membership retry instead of an upsell when verification fails", () => {
    const retry = vi.fn();
    render(<SebastianChatLauncher requiresUpgrade membershipError retryMembership={retry} />);
    fireEvent.click(screen.getByRole('button', {name:'Ask Sebastian'}));
    fireEvent.click(screen.getByRole('button', {name:'Check membership again'}));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', {name:'Compare Plus & Pro'})).not.toBeInTheDocument();
  });
});
