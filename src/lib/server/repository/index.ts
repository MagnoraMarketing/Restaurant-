import { isSupabaseConfigured, serverEnv } from "@/lib/server/env";
import { isPlaceholderPhone } from "@/lib/format";
import type { Restaurant } from "@/lib/types";
import { memoryRepository } from "./memory";
import { supabaseRepository } from "./supabase";
import type { Repository } from "./types";

export type { Repository, WebhookLogEntry } from "./types";

export const repo = (): Repository => (isSupabaseConfigured() ? supabaseRepository : memoryRepository);

/**
 * Telefonnummeret kommer fra databasen/konfigurationen – aldrig hardcodet i komponenter.
 * I demo-mode kan AIBOOKING_DEMO_PHONE overstyre pladsholder-numre, så "Ring til demoen"
 * peger på den rigtige AI-telefonlinje.
 */
function withPhone(r: Restaurant): Restaurant {
  if (serverEnv.demoPhone && isPlaceholderPhone(r.phone)) return { ...r, phone: serverEnv.demoPhone };
  return r;
}

export async function getRestaurant(idOrSlug: string): Promise<Restaurant | null> {
  const r = await repo().getRestaurant(idOrSlug);
  return r ? withPhone(r) : null;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  return (await repo().listRestaurants()).map(withPhone);
}

export async function getDefaultRestaurant(): Promise<Restaurant> {
  const r = (await getRestaurant(serverEnv.defaultRestaurantSlug)) ?? (await listRestaurants())[0];
  if (!r) throw new Error("Ingen restauranter fundet – kør supabase/seed.sql eller brug demo-mode.");
  return r;
}

/** Nummeret til "Ring til demoen" på landingssiden. */
export async function getDemoPhone(): Promise<string> {
  if (serverEnv.demoPhone) return serverEnv.demoPhone;
  return (await getDefaultRestaurant()).phone;
}
