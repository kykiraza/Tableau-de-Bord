import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface ThemeCtx { dark: boolean; setDark: (d: boolean) => void }
const Ctx = createContext<ThemeCtx>({ dark: false, setDark: () => {} });
const KEY = "madatrans.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    try { setDark(window.localStorage.getItem(KEY) === "dark"); } catch { /* stockage indisponible */ }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { window.localStorage.setItem(KEY, dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  return <Ctx.Provider value={{ dark, setDark }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
