export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data as T;
}

export const api = {
  signup: (v: { name: string; email: string; password: string }) =>
    request<{ message: string; email: string }>("POST", "/auth/signup", v),
  verify: (email: string, code: string) => request<{ user: AuthUser }>("POST", "/auth/verify", { email, code }),
  resend: (email: string) => request<{ message: string }>("POST", "/auth/resend", { email }),
  login: (v: { email: string; password: string; remember: boolean }) =>
    request<{ user: AuthUser }>("POST", "/auth/login", v),
  me: () => request<{ user: AuthUser }>("GET", "/auth/me"),
  logout: () => request<{ message: string }>("POST", "/auth/logout"),
  rewardStatus: () => request<{ claimed: boolean }>("GET", "/reward/status"),
  claimReward: () => request<{ claimed: boolean; balance: number }>("POST", "/reward/claim"),
  wallet: () => request<{ balance: number }>("GET", "/wallet"),
};
