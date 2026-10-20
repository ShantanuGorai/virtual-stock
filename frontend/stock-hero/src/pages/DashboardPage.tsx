import { useNavigate } from "react-router-dom";
import { AppleStyleDock } from "@/components/apple-style-dock";
import { api } from "@/lib/api";

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
    // relative + min-h-screen so the dock sits at the bottom of the screen
    <div className="relative min-h-screen w-full bg-background">
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
