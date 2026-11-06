"use client";
import { createContext, useContext } from "react";
export const ShellContext = createContext(false);
export const useAppShell = () => useContext(ShellContext);
