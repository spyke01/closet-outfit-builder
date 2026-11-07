import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppDialog } from "../ui/app-dialog";

describe("nested dialogs", () => {
  it("closes the child without closing its parent on Escape or close events", () => {
    const parent = vi.fn(), child = vi.fn();
    render(<AppDialog open title="Chat" onClose={parent}><AppDialog open title="Outfit" onClose={child}>Board</AppDialog></AppDialog>);
    const dialog = screen.getByRole("dialog", { name: "Outfit" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(child).toHaveBeenCalledOnce(); expect(parent).not.toHaveBeenCalled();
    fireEvent(dialog, new Event("close", { bubbles: true }));
    expect(parent).not.toHaveBeenCalled();
  });
});
