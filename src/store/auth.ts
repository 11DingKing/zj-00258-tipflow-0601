import { create } from "zustand";
import type { User } from "../../shared/types";
import { api } from "../lib/api";

interface AuthState {
  user: User | null;
  login: (username: string) => Promise<User>;
  logout: () => void;
  restore: () => void;
}

const USER_KEY = "current_user";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,

  restore() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) set({ user: JSON.parse(raw) as User });
    } catch {}
  },

  login: async (username: string) => {
    const res = await api.login(username);
    if (!res.success || !res.user) throw new Error(res.message || "登录失败");
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    set({ user: res.user });
    return res.user;
  },

  logout() {
    localStorage.removeItem(USER_KEY);
    set({ user: null });
  },
}));
