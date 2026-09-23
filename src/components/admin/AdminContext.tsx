"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Restaurant } from "@/lib/types";
import { api } from "@/lib/client/api";

interface AdminCtx {
  restaurants: Restaurant[];
  restaurant: Restaurant | null;
  select(slug: string): void;
  refreshRestaurant(): Promise<void>;
}

const Ctx = createContext<AdminCtx | null>(null);
const KEY = "aibooking-admin-restaurant";

/** Multi-tenant: admin arbejder altid på én valgt restaurant ad gangen. */
export function AdminProvider({ initial, children }: { initial: Restaurant[]; children: React.ReactNode }) {
  const [restaurants, setRestaurants] = useState(initial);
  const [slug, setSlug] = useState(initial[0]?.slug ?? "");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && initial.some((r) => r.slug === saved)) setSlug(saved);
    } catch {
      /* ignore */
    }
  }, [initial]);

  const select = (s: string) => {
    setSlug(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {
      /* ignore */
    }
  };

  const refreshRestaurant = useCallback(async () => {
    const list = await api<Restaurant[]>("/api/restaurants");
    setRestaurants(list);
  }, []);

  const restaurant = restaurants.find((r) => r.slug === slug) ?? restaurants[0] ?? null;
  return <Ctx.Provider value={{ restaurants, restaurant, select, refreshRestaurant }}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin kræver AdminProvider");
  return c;
}

/** Polling-hook til live-data i admin. */
export function usePoll<T>(path: string | null, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    const load = () =>
      api<T>(path)
        .then((d) => {
          if (alive) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => alive && setError(e.message));
    load();
    const t = intervalMs > 0 ? setInterval(load, intervalMs) : undefined;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [path, intervalMs, tick]);
  return { data, error, reload: () => setTick((n) => n + 1), setData };
}
