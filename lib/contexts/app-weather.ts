"use client";
import { createContext, useContext } from "react";
import { useConditionalWeather } from "@/lib/hooks/use-conditional-weather";
export const WeatherContext = createContext<ReturnType<
  typeof useConditionalWeather
> | null>(null);
// The shell shares one weather request; standalone pages keep their fallback.
export function useAppWeather() {
  const shared = useContext(WeatherContext);
  const fallback = useConditionalWeather(!shared);
  return shared || fallback;
}
