import * as React from "react";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<"loading" | "in" | "out">("loading");

  React.useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => setStatus(res.ok ? "in" : "out"))
      .catch(() => setStatus("out"));
  }, []);

  if (status === "loading") return null;
  if (status === "out") return <Navigate to="/auth?mode=login" replace />;
  return <>{children}</>;
}