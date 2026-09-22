import { serverEnv } from "@/lib/server/env";
import type { BookingAdapter } from "./index";

// Cal.com-adapter: spejler bordreservationen til Cal.com (v2 API), så restauranter
// der allerede bruger Cal.com får AI-bookinger direkte i deres kalender.

export const calcomAdapter: BookingAdapter = {
  name: "Cal.com",
  isConfigured: () => Boolean(serverEnv.calcomApiKey && serverEnv.calcomEventTypeId),
  async pushBooking(booking, restaurant) {
    const start = new Date(`${booking.date}T${booking.time}:00`).toISOString();
    const res = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.calcomApiKey}`,
        "cal-api-version": "2024-08-13",
      },
      body: JSON.stringify({
        eventTypeId: Number(serverEnv.calcomEventTypeId),
        start,
        attendee: {
          name: booking.customer.name,
          email: booking.customer.email || `no-reply+${booking.reference}@aibooking.dk`,
          phoneNumber: booking.customer.phone,
          timeZone: "Europe/Copenhagen",
          language: "da",
        },
        metadata: { restaurant: restaurant.slug, reference: booking.reference, partySize: String(booking.partySize) },
        bookingFieldsResponses: { notes: `${booking.partySize} personer. ${booking.comment ?? ""}`.trim() },
      }),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => ({}))) as { data?: { uid?: string }; error?: { message?: string } };
    if (!res.ok) throw new Error(`Cal.com: ${json.error?.message ?? res.status}`);
    return { externalId: json.data?.uid, detail: "Oprettet i Cal.com" };
  },
};
