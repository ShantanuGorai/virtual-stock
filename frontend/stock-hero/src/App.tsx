import { Routes, Route } from "react-router-dom";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import AuthPage from "@/pages/AuthPage";
import RewardPage from "@/pages/RewardPage";
import DashboardPage from "@/pages/DashboardPage";
import RequireAuth from "@/components/RequireAuth";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="overflow-x-hidden w-[100%] min-h-screen">
            <CinematicHero />
          </div>
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/reward"
        element={
          <RequireAuth>
            <RewardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;