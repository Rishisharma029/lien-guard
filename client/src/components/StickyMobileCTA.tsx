import { Button } from "@/components/ui/button";
import { ChevronRight, Zap, FolderPlus } from "lucide-react";
import { useLocation } from "wouter";

export function StickyMobileCTA({ onRegister }: { onRegister?: () => void }) {
  const [location, navigate] = useLocation();

  // Only display on public pages (not inside authenticated workspace where bottom nav exists)
  const isPublicPage = location === "/" || location === "/about" || location === "/privacy" || location === "/terms" || location === "/contact";
  if (!isPublicPage) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0b1627]/95 backdrop-blur-md border-t border-white/10 p-3 sm:hidden shadow-2xl safe-area-pb">
      <div className="flex items-center gap-2">
        <Button
          onClick={onRegister ? onRegister : () => navigate("/cases")}
          className="flex-1 bg-[#bcff6b] hover:bg-[#aef558] text-[#0b1627] font-bold text-xs h-10 rounded-lg shadow"
        >
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Register a Case
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/demo")}
          className="bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold h-10 px-3 rounded-lg shrink-0"
        >
          <Zap className="h-3.5 w-3.5 mr-1" /> Demo
        </Button>
      </div>
    </div>
  );
}
