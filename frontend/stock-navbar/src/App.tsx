import { useState } from "react";
import { Home, User, Briefcase, FileText } from "lucide-react";
import { GlassmorphismNavBar } from "@/components/ui/glassmorphism-navigation";
import "./App.css";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const navItems = [
    { name: "Home", url: "#", icon: Home },
    { name: "About", url: "#", icon: User },
    { name: "Projects", url: "#", icon: Briefcase },
    { name: "Resume", url: "#", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 transition-colors duration-300">
      <GlassmorphismNavBar
        items={navItems}
        defaultTheme="light"
        onThemeChange={setTheme}
      />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold text-foreground">
            Glassmorphism Navigation
          </h1>
          <p className="text-xl text-muted-foreground">
            A beautiful navigation bar with glassmorphism design and dark mode
            support. Click the theme toggle to switch between light and dark
            modes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Glassmorphism</h3>
              <p className="text-sm text-muted-foreground">
                Beautiful frosted glass effect with backdrop blur
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Dark Mode</h3>
              <p className="text-sm text-muted-foreground">
                Seamless theme switching with smooth transitions
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Responsive</h3>
              <p className="text-sm text-muted-foreground">
                Icons on mobile, text labels on desktop
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Animated</h3>
              <p className="text-sm text-muted-foreground">
                Smooth animations powered by Framer Motion
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
