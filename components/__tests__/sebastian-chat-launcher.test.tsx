import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { SebastianChatLauncher } from "../sebastian-chat-launcher";

vi.mock("@/components/sebastian-avatar", () => ({
  SebastianAvatar: ({ className }: { className?: string }) => (
    <div data-testid="sebastian-avatar" className={className}>
      S
    </div>
  ),
}));

describe("SebastianChatLauncher", () => {
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
