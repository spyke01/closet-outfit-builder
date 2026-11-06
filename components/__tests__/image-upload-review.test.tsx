import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageUpload } from "../image-upload";

vi.mock("@/lib/utils/image-resize", () => ({
  resizeImageFileForUpload: async (file: File) => file,
  transformImageFileForAvatar: async (file: File) => file,
}));
const file = () => {
  const value = new File(["photo"], "shirt.png", { type: "image/png" });
  Object.defineProperty(value, "arrayBuffer", {
    value: async () => new ArrayBuffer(8),
  });
  return value;
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("crypto", {
    subtle: { digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)) },
    randomUUID: vi.fn().mockReturnValue("11111111-1111-4111-8111-111111111111"),
  });
  vi.mocked(fetch).mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("clothing photo review", () => {
  it("keeps the original until the user explicitly chooses the cleaned candidate", async () => {
    vi.mocked(fetch).mockResolvedValue(
      respond({
        success: true,
        imageUrl: "/original",
        originalImageUrl: "/original",
        preparedImageUrl: "/cleaned",
        bgRemovalStatus: "completed",
      }),
    );
    const onUpload = vi.fn(),
      onMetadata = vi.fn();
    render(<ImageUpload onUpload={onUpload} onMetadata={onMetadata} />);
    fireEvent.change(screen.getByLabelText("Choose a clothing photo"), {
      target: { files: [file()] },
    });
    await screen.findByRole("radio", { name: "Use cleaned photo" });
    expect(onUpload).toHaveBeenCalledExactlyOnceWith("/original");
    expect(onMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        original_image_url: "/original",
        prepared_image_url: "/cleaned",
      }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Use cleaned photo" }));
    expect(onUpload).toHaveBeenLastCalledWith("/cleaned");
    fireEvent.click(screen.getByRole("radio", { name: "Use original" }));
    expect(onUpload).toHaveBeenLastCalledWith("/original");
  });

  it("reuses the same request ID after a failed HTTP response for the same photo", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(respond({ error: "Upload unavailable" }, 503))
      .mockResolvedValueOnce(
        respond({
          success: true,
          imageUrl: "/original",
          bgRemovalStatus: "failed",
        }),
      );
    const onUpload = vi.fn();
    render(<ImageUpload onUpload={onUpload} />);
    const input = screen.getByLabelText("Choose a clothing photo");
    fireEvent.change(input, { target: { files: [file()] } });
    await screen.findByText("Upload unavailable");
    fireEvent.change(input, { target: { files: [file()] } });
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith("/original"));
    const bodies = vi
      .mocked(fetch)
      .mock.calls.map(([, options]) => options!.body as FormData);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].get("requestId")).toBe(bodies[1].get("requestId"));
    expect(crypto.randomUUID).toHaveBeenCalledOnce();
    expect(
      screen.getByText(/Background cleanup is unavailable/),
    ).toBeInTheDocument();
  });
});
