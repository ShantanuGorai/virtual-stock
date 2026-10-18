export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body ?? {}),
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
    request<{ message: string; email: string }>("/signup", v),
  verify: (email: string, code: string) => request<{ user: AuthUser }>("/verify", { email, code }),
  resend: (email: string) => request<{ message: string }>("/resend", { email }),
  login: (v: { email: string; password: string; remember: boolean }) =>
    request<{ user: AuthUser }>("/login", v),
};