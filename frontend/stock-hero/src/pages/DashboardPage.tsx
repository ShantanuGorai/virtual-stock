import { useNavigate } from "react-router-dom";
import { Home, LineChart, Briefcase, GraduationCap } from "lucide-react";
import { GlassmorphismNavBar } from "@/components/ui/glassmorphism-navigation";
import { AppleStyleDock } from "@/components/apple-style-dock";
import WalletBadge from "@/components/WalletBadge";
import { api } from "@/lib/api";

// Top navbar links (they are placeholders for now: set `url` when the pages exist)
const navItems = [
  { name: "Fixed Time", url: "#", icon: Home },
  { name: "InZone", url: "#", icon: LineChart },
  { name: "Forex", url: "#", icon: Briefcase },
  { name: "Stocks", url: "#", icon: GraduationCap },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await api.logout();
    } finally {
      navigate("/");
    }
  };

  return (
    // relative + min-h-screen so the dock sits inside the page
    <div className="relative min-h-screen w-full bg-background">
      <GlassmorphismNavBar items={navItems} defaultTheme="light" trailing={<WalletBadge />} />
      <button
        type="button"
        onClick={handleSignOut}
        className="absolute right-4 top-4 border-0 bg-transparent p-0 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Sign out
      </button>
      <AppleStyleDock />
    </div>
  );
}
