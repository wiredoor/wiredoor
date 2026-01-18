import Cookies from "js-cookie";
import { create } from "zustand";
import axios from "@/lib/axios";

type LoginResponse = {
  token: string;
  expires_in: number;
};

type SessionState = {
  token?: string;
  redirect: string;

  isAuthenticated: () => boolean;

  login: (username: string, password: string) => Promise<void>;
  setRedirect: (to: string) => void;

  logout: (opts?: { navigate?: (to: string, options?: { replace?: boolean }) => void }) => void;
};

function readInitialToken() {
  return Cookies.get("token");
}

function readInitialRedirect() {
  return localStorage.getItem("redirect") || "/";
}

function setTokenCookie(token: string, expires_in: number) {
  Cookies.set("token", token, {
    secure: import.meta.env.APP_ENV === "production",
    sameSite: "Strict",
    expires: expires_in,
  });
}

function clearTokenCookie() {
  Cookies.remove("token");
}

export const useAuthStore = create<SessionState>((set, get) => ({
  token: readInitialToken(),
  redirect: readInitialRedirect(),

  isAuthenticated: () => Boolean(get().token),

  login: async (username, password) => {
    const { data } = await axios.post<LoginResponse>("/api/auth/login", {
      username,
      password,
    });

    setTokenCookie(data.token, data.expires_in);

    set({ token: data.token });
  },

  setRedirect: (to) => {
    localStorage.setItem("redirect", to);
    set({ redirect: to });
  },

  logout: (opts) => {
    const currentPath = window.location.pathname;
    get().setRedirect(currentPath);

    set({ token: undefined });
    clearTokenCookie();

    try {
      if (opts?.navigate) {
        opts.navigate("/login", { replace: true });
        return;
      }
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
      window.location.href = "/login";
    }
  },
}));
