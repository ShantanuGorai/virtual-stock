import { Routes, Route } from "react-router-dom";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import AuthPage from "@/pages/AuthPage";

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
    </Routes>
  );
}

export default App;