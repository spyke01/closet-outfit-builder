"use client";

import { type ReactNode } from "react";
import { useConditionalWeather } from "@/lib/hooks/use-conditional-weather";

import { WeatherContext } from "@/lib/contexts/app-weather";
export function AppWeatherProvider({ children }: { children: ReactNode }) {
  const weather = useConditionalWeather(true);
  return (
    <WeatherContext.Provider value={weather}>
      {children}
    </WeatherContext.Provider>
  );
}
