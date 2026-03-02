import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SignUpForm } from "@/components/sign-up-form";
import { mockSupabaseClient } from "@/lib/test/setup";

const mockPush = vi.fn();
const mockTrackSignUp = vi.fn();
const mockTrackSignUpStart = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/utils/url-config", () => ({
  getAuthCallbackUrl: () => "https://example.com/auth/callback?next=%2Ftoday",
  getAuthConfirmUrl: () => "https://example.com/auth/confirm",
  logUrlConfig: vi.fn(),
}));

vi.mock("@/lib/analytics/gtag", () => ({
  trackSignUp: (...args: unknown[]) => mockTrackSignUp(...args),
  trackSignUpStart: (...args: unknown[]) => mockTrackSignUpStart(...args),
}));

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks a successful email sign-up", async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({ error: null });

    render(<SignUpForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "hunter2secure" },
    });
    fireEvent.change(screen.getByLabelText(/repeat password/i), {
      target: { value: "hunter2secure" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
      expect(mockTrackSignUp).toHaveBeenCalledWith({ method: "email" });
      expect(mockPush).toHaveBeenCalledWith("/auth/sign-up-success");
    });
  });

  it("tracks a successful Google OAuth sign-up start", async () => {
    mockSupabaseClient.auth.signInWithOAuth = vi.fn().mockResolvedValueOnce({
      data: { provider: "google" },
      error: null,
    });

    render(<SignUpForm />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalled();
      expect(mockTrackSignUpStart).toHaveBeenCalledWith({ method: "google" });
    });
  });

  it("does not track conversions when sign-up fails", async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      error: new Error("Signup failed"),
    });

    render(<SignUpForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "hunter2secure" },
    });
    fireEvent.change(screen.getByLabelText(/repeat password/i), {
      target: { value: "hunter2secure" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
    });

    expect(mockTrackSignUp).not.toHaveBeenCalled();
    expect(mockTrackSignUpStart).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
