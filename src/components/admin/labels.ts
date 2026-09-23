import type { BookingStatus, OrderSource, OrderStatus, PaymentStatus } from "@/lib/types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  new: { label: "Ny", cls: "bg-ember-500/15 text-ember-300 ring-ember-500/30" },
  accepted: { label: "Accepteret", cls: "bg-sky-400/15 text-sky-300 ring-sky-400/30" },
  ready: { label: "Klar", cls: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30" },
  completed: { label: "Afsluttet", cls: "bg-white/8 text-ink-300 ring-white/10" },
  rejected: { label: "Afvist", cls: "bg-red-400/15 text-red-300 ring-red-400/30" },
};

export const SOURCE: Record<OrderSource, { label: string; icon: string }> = {
  website: { label: "Hjemmeside", icon: "🌐" },
  chat: { label: "Chat", icon: "💬" },
  voice: { label: "AI Voice", icon: "🎙️" },
  phone: { label: "Telefon", icon: "📞" },
  shopify: { label: "Shopify", icon: "🛍️" },
  pos: { label: "POS", icon: "🧾" },
  api: { label: "API", icon: "🔌" },
};

export const PAYMENT: Record<PaymentStatus, string> = {
  unpaid: "Ikke betalt",
  pending: "Afventer betaling",
  paid: "Betalt",
  pay_on_pickup: "Betales ved levering/afhentning",
  refunded: "Refunderet",
};

export const BOOKING_STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  pending: { label: "Afventer", cls: "bg-amber-400/15 text-amber-300" },
  confirmed: { label: "Bekræftet", cls: "bg-emerald-400/15 text-emerald-300" },
  seated: { label: "Ankommet", cls: "bg-sky-400/15 text-sky-300" },
  cancelled: { label: "Annulleret", cls: "bg-red-400/15 text-red-300" },
  no_show: { label: "Udeblevet", cls: "bg-white/8 text-ink-300" },
};
