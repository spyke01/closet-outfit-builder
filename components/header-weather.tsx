"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CloudSun,
  CloudRain,
  Sun,
  Cloud,
  ChevronDown,
  RefreshCw,
  Droplets,
} from "lucide-react";
import { useAppWeather } from "@/lib/contexts/app-weather";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { useUpdateUserPreferences } from "@/lib/hooks/use-user-preferences";
import { setFeatureFlags } from "@/lib/utils/feature-flags";

export function HeaderWeather() {
  const weather = useAppWeather();
  const [open, setOpen] = useState(false);
  const updatePreferences = useUpdateUserPreferences();
  const [enableError, setEnableError] = useState("");
  const { error, retry, usingFallback } = weather;
  const current = weather.weatherEnabled ? weather.current : null;
  const forecast = weather.weatherEnabled ? weather.forecast : [];
  const locationLabel = weather.weatherEnabled ? weather.locationLabel : null;
  const loading =
    weather.loading || weather.preferenceLoading || updatePreferences.isPending;
  const disabled =
    !weather.weatherEnabled && !loading && !weather.preferenceError;
  const enableWeather = async () => {
    setEnableError("");
    try {
      await updatePreferences.mutateAsync({ weather_enabled: true });
      setFeatureFlags({ weather: true });
      weather.retryPreferences?.();
    } catch {
      setEnableError("Could not enable weather. Please try again.");
    }
  };
  const today = forecast[0];
  const Icon = /rain|drizzle|storm/i.test(current?.condition || "")
    ? CloudRain
    : /clear|sunny/i.test(current?.condition || "")
      ? Sun
      : /cloud/i.test(current?.condition || "")
        ? CloudSun
        : Cloud;
  const percent = (value: number) =>
    Math.round(value <= 1 ? value * 100 : value);
  const rain = today?.precipitationProbability;
  const outlook = forecast.slice(0, 7);
  const lowest = Math.min(...outlook.map(day => day.temperature.low));
  const highest = Math.max(...outlook.map(day => day.temperature.high));
  const span = Math.max(1, highest - lowest);
  return (
    <>
      <button
        type="button"
        className="app-weather-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open weather details"
        aria-haspopup="dialog"
      >
        <Icon size={25} className="shrink-0 text-primary" aria-hidden="true" />
        <span>
          <strong>
            {current
              ? `${Math.round(current.temperature)}°F`
              : loading
                ? "Weather…"
                : disabled
                  ? "Weather off"
                  : "Weather unavailable"}
          </strong>
          <span className="app-weather-summary">
            {disabled
              ? "Click to enable"
              : weather.preferenceError
                ? "Click to retry"
                : locationLabel?.name ||
                  (usingFallback ? "Estimated weather" : "Local weather")}
            {today &&
              ` · H ${Math.round(today.temperature.high)}° / L ${Math.round(today.temperature.low)}°`}
            {rain !== undefined && ` · ${percent(rain)}% rain`}
          </span>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <AppDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Your weather"
      >
        <p className="text-sm text-muted-foreground">
          {disabled
            ? "Turn on local weather to see conditions and plan what to wear."
            : weather.preferenceError
              ? "Your weather preferences could not be loaded."
              : loading && !current
                ? "Loading your local weather…"
                : locationLabel?.label || "Your current location"}
          {usingFallback && " · Estimated weather"}
        </p>
        {disabled && (
          <Button
            className="mt-4"
            onClick={() => void enableWeather()}
            disabled={updatePreferences.isPending}
          >
            Enable weather
          </Button>
        )}
        {enableError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {enableError}
          </p>
        )}
        {current && (
          <div className="my-5 flex items-center gap-4">
            <Icon size={52} className="text-primary" />
            <div>
              <p className="text-4xl font-semibold">
                {Math.round(current.temperature)}°F
              </p>
              <p>{current.condition}</p>
            </div>
          </div>
        )}
        {current && (
          <dl className="mb-5 grid grid-cols-3 gap-3 border-y border-border py-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Feels like</dt>
              <dd className="mt-1">
                {current.feelsLike === undefined
                  ? "—"
                  : `${Math.round(current.feelsLike)}°F`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Wind</dt>
              <dd className="mt-1">
                {current.windSpeed === undefined
                  ? "—"
                  : `${Math.round(current.windSpeed)} mph`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Humidity</dt>
              <dd className="mt-1">
                {current.humidity === undefined
                  ? "—"
                  : `${Math.round(current.humidity)}%`}
              </dd>
            </div>
          </dl>
        )}
        {weather.weatherEnabled && error && (
          <p role="status" className="my-4 text-sm text-muted-foreground">
            {error.error}
          </p>
        )}
        {outlook.length > 0 && <section className="weather-outlook" aria-label="Daily forecast">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{outlook.length}-day outlook</h3>
          <div className="divide-y divide-border">
          {outlook.map((day, index) => {
            const DayIcon = /rain|drizzle|storm/i.test(day.condition) ? CloudRain : /clear|sunny/i.test(day.condition) ? Sun : /overcast/i.test(day.condition) ? Cloud : CloudSun;
            return <div className="weather-outlook-row" key={day.date}>
              <p className="text-sm font-medium">
                {index === 0 ? "Today" : new Date(
                  `${day.date.slice(0, 10)}T12:00:00`,
                ).toLocaleDateString(undefined, {
                  weekday: "short",
                })}
              </p>
              <span className="weather-day-condition" title={day.condition}><DayIcon size={24} aria-hidden="true" /><span className="sr-only">{day.condition}</span></span>
              <span className="weather-rain"><Droplets size={12} aria-hidden="true" />{day.precipitationProbability === undefined ? "—" : `${percent(day.precipitationProbability)}%`}<span className="sr-only"> chance of rain</span></span>
              <span className="weather-low"><span className="sr-only">Low </span>{Math.round(day.temperature.low)}°</span>
              <span className="weather-range" aria-hidden="true"><span style={{left:`${(day.temperature.low-lowest)/span*100}%`,width:`${Math.max(6,(day.temperature.high-day.temperature.low)/span*100)}%`}} /></span>
              <span className="weather-high"><span className="sr-only">High </span>{Math.round(day.temperature.high)}°</span>
            </div>;
          })}
          </div>
        </section>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {!disabled && (
            <Button
              variant="outline"
              disabled={loading}
              onClick={
                weather.preferenceError ? weather.retryPreferences : retry
              }
            >
              <RefreshCw size={16} />
              Refresh weather
            </Button>
          )}
          <Link
            className="text-sm text-primary underline"
            href="/settings"
            onClick={() => setOpen(false)}
          >
            Weather preferences
          </Link>
        </div>
      </AppDialog>
    </>
  );
}
