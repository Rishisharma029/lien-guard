import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  if (!toggleTheme) return null;
  const isDark = theme === "dark";
  return <Button aria-label={`Switch to ${isDark ? "light" : "dark"} theme`} onClick={toggleTheme} variant="outline" className="fixed bottom-20 right-4 z-50 h-10 gap-2 rounded-full border-border bg-card/95 px-4 text-xs font-bold shadow-lg backdrop-blur lg:bottom-5"><span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">{isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}</span><span>{isDark ? "Light" : "Dark"}</span></Button>;
}
