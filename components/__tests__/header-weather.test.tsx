import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderWeather } from "../header-weather";
import type { useAppWeather } from "@/lib/contexts/app-weather";

const state = vi.hoisted(() => ({
  weather: {} as ReturnType<typeof useAppWeather>,
  update: vi.fn(),
}));
vi.mock("@/lib/contexts/app-weather", () => ({
  useAppWeather: () => state.weather,
}));
vi.mock("@/lib/hooks/use-user-preferences", () => ({
  useUpdateUserPreferences: () => ({
    mutateAsync: state.update,
    isPending: false,
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.update.mockResolvedValue({ weather_enabled: true });
  state.weather = {
    current: null,
    forecast: [],
    loading: false,
    error: null,
    usingFallback: false,
    retry: vi.fn(),
    weatherEnabled: false,
    preferenceLoading: false,
    weatherDisabledReason: "preference-off",
    retryPreferences: vi.fn(),
  };
});
afterEach(cleanup);
describe("shared header weather", () => {
  it("keeps the control visible while off and enables weather only after the user asks", async () => {
    render(<HeaderWeather />);
    expect(screen.getByText("Weather off")).toBeInTheDocument();
    expect(state.update).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Open weather details" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enable weather" }));
    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith({ weather_enabled: true }),
    );
    expect(state.weather.retryPreferences).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem("feature-flags")!)).toMatchObject({
      weather: true,
    });
  });
  it("shows a loading control instead of removing the header while preferences load", () => {
    state.weather.preferenceLoading = true;
    render(<HeaderWeather />);
    expect(screen.getByText("Weather…")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open weather details" }),
    );
    expect(
      screen.queryByRole("button", { name: "Enable weather" }),
    ).not.toBeInTheDocument();
    expect(state.update).not.toHaveBeenCalled();
  });
  it("offers a preferences retry when the preference query fails", () => {
    state.weather.preferenceError = true;
    state.weather.weatherDisabledReason = "preferences-error";
    render(<HeaderWeather />);
    expect(screen.getByText("Weather unavailable")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open weather details" }),
    );
    expect(
      screen.getByText("Your weather preferences could not be loaded."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh weather" }));
    expect(state.weather.retryPreferences).toHaveBeenCalledOnce();
    expect(state.weather.retry).not.toHaveBeenCalled();
  });
  it("keeps the current conditions and detailed forecast in the existing header control", () => {
    state.weather = {
      ...state.weather,
      weatherEnabled: true,
      current: {
        temperature: 58,
        condition: "Partly cloudy",
        icon: "02d",
        feelsLike: 56,
      },
      forecast: [
        {
          date: "2026-11-06",
          temperature: { high: 62, low: 48 },
          condition: "Partly cloudy",
          icon: "02d",
          precipitationProbability: 0.2,
        },
      ],
      locationLabel: { name: "Chicago", label: "Chicago, IL" },
    };
    render(<HeaderWeather />);
    expect(
      screen.getByText("Chicago · H 62° / L 48° · 20% rain"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Open weather details" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Your weather" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Feels like")).toBeInTheDocument();
    expect(screen.getByRole('region', {name:'Daily forecast'})).toHaveTextContent('20%');
    expect(screen.getByText('1-day outlook')).toBeInTheDocument();
  });
});
