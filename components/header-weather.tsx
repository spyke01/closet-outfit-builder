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
} from "lucide-react";
import { useAppWeather } from "@/lib/contexts/app-weather";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";

export function HeaderWeather() {
  const weather = useAppWeather();
  const [open, setOpen] = useState(false);
  if (!weather.weatherEnabled) return null;
  const {
    current,
    forecast,
    loading,
    error,
    retry,
    usingFallback,
    locationLabel,
  } = weather;
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
                : "Weather unavailable"}
          </strong>
          <span className="app-weather-summary">
            {locationLabel?.name ||
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
          {locationLabel?.label || "Your current location"}
          {usingFallback && " · Estimated weather"}
        </p>
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
        {error && (
          <p role="status" className="my-4 text-sm text-muted-foreground">
            {error.error}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {forecast.slice(0, 3).map((day) => (
            <div className="rounded-xl border border-border p-3" key={day.date}>
              <p className="font-medium">
                {new Date(
                  `${day.date.slice(0, 10)}T12:00:00`,
                ).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="my-2 text-lg">
                {Math.round(day.temperature.high)}° /{" "}
                {Math.round(day.temperature.low)}°
              </p>
              <p className="text-sm text-muted-foreground">{day.condition}</p>
              {day.precipitationProbability !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {percent(day.precipitationProbability)}% chance of rain
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" disabled={loading} onClick={retry}>
            <RefreshCw size={16} />
            Refresh weather
          </Button>
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
