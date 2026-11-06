import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConditionalWeather } from "../use-conditional-weather";
const state = vi.hoisted(() => ({
  preferences: {
    data: undefined as { weather_enabled: boolean } | undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  },
  useWeather: vi.fn(),
  feature: true,
}));
vi.mock("@/lib/hooks/use-user-preferences", () => ({
  useUserPreferences: () => state.preferences,
}));
vi.mock("@/lib/hooks/use-weather", () => ({
  useWeather: (enabled: boolean) => state.useWeather(enabled),
}));
vi.mock("@/lib/utils/feature-flags", () => ({
  isFeatureEnabled: () => state.feature,
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.preferences = {
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  };
  state.feature = true;
  state.useWeather.mockReturnValue({
    current: null,
    forecast: [],
    loading: false,
    retry: vi.fn(),
    error: null,
    usingFallback: false,
  });
});
describe("weather preference gating", () => {
  it("does not start location/weather work before preferences load", () => {
    const { result } = renderHook(() => useConditionalWeather(true));
    expect(state.useWeather).toHaveBeenLastCalledWith(false);
    expect(result.current.weatherDisabledReason).toBe("preferences-loading");
  });
  it("preserves an explicit off preference and enables only a loaded on preference", () => {
    state.preferences = {
      ...state.preferences,
      isLoading: false,
      data: { weather_enabled: false },
    };
    const { result, rerender } = renderHook(() => useConditionalWeather(true));
    expect(result.current.weatherDisabledReason).toBe("preference-off");
    expect(state.useWeather).toHaveBeenLastCalledWith(false);
    state.preferences.data = { weather_enabled: true };
    rerender();
    expect(result.current.weatherEnabled).toBe(true);
    expect(state.useWeather).toHaveBeenLastCalledWith(true);
  });
  it("distinguishes preference failures, browser flags, and signed-out use", () => {
    state.preferences = {
      ...state.preferences,
      isLoading: false,
      isError: true,
    };
    const { result, rerender } = renderHook(
      ({ authenticated }) => useConditionalWeather(authenticated),
      { initialProps: { authenticated: true } },
    );
    expect(result.current.weatherDisabledReason).toBe("preferences-error");
    expect(state.useWeather).toHaveBeenLastCalledWith(false);
    result.current.retryPreferences?.();
    expect(state.preferences.refetch).toHaveBeenCalledOnce();
    state.preferences.isError = false;
    state.preferences.data = { weather_enabled: true };
    state.feature = false;
    rerender({ authenticated: true });
    expect(result.current.weatherDisabledReason).toBe("feature-off");
    rerender({ authenticated: false });
    expect(result.current.weatherDisabledReason).toBe("signed-out");
    expect(state.useWeather).toHaveBeenLastCalledWith(false);
  });
});
