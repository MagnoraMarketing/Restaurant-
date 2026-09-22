import { handler, json } from "@/lib/server/http";
import { listRestaurants } from "@/lib/server/repository";
import { toPublicRestaurant } from "@/lib/server/public";

/** GET /api/restaurants – offentlige oplysninger om aktive restauranter. */
export const GET = handler(async () => json({ data: (await listRestaurants()).map(toPublicRestaurant) }));
