// Domæne-typer for AIbooking Restaurant.
// Alle tenant-data bærer et restaurantId, så flere restauranter kan køre på samme platform
// uden at data blandes (se supabase/migrations for den tilsvarende database-model).

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = søndag (JS Date.getDay)

export interface OpeningHours {
  day: Weekday;
  open: string; // "11:00"
  close: string; // "22:00"
  closed?: boolean;
}

export type IndustryKey = "pizzeria" | "restaurant" | "fastfood" | "sushi" | "cafe";

export interface WidgetConfig {
  restaurantId: string;
  agentId?: string;
  voiceAgentId?: string;
  chatAgentId?: string;
  theme: "dark" | "light";
  accentColor: string;
  welcomeMessage: string;
  position: "bottom-right" | "bottom-left";
  enabled: boolean;
}

export interface FaqEntry {
  question: string;
  answer: string;
  keywords: string[];
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  industry: IndustryKey;
  emoji: string;
  accentColor: string;
  heroImage: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  parking: string;
  openingHours: OpeningHours[];
  delivery: {
    enabled: boolean;
    fee: number;
    minimumOrder: number;
    areas: string[];
    estimatedMinutes: number;
  };
  pickup: { enabled: boolean; estimatedMinutes: number };
  /** Bestilling ved bordet via QR-kode / NFC-chip på bordet. */
  tableOrdering: { enabled: boolean; tables: number };
  booking: {
    enabled: boolean;
    maxPartySize: number;
    largePartyThreshold: number;
    slotMinutes: number;
    durationMinutes: number;
    rules: string;
  };
  paymentMethods: PaymentMethod[];
  faq: FaqEntry[];
  widget: WidgetConfig;
  /** Hvor NFC-anmeldelseschippen sender gæsten hen (fx Google-anmeldelse). Styres i admin. */
  reviewUrl?: string;
}

export type PaymentMethod = "card" | "mobilepay" | "cash_on_pickup" | "invoice";

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  emoji: string;
  sortOrder: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number; // kr. (kan være 0)
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: "single" | "multiple" | "remove";
  required?: boolean;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  emoji: string;
  allergens: string[];
  tags?: string[];
  popular?: boolean;
  available: boolean;
  modifierGroups: ModifierGroup[];
}

export interface Menu {
  categories: Category[];
  products: Product[];
}

export type OrderSource = "website" | "chat" | "voice" | "phone" | "shopify" | "pos" | "api";
export type FulfillmentType = "delivery" | "pickup" | "table";
export type OrderStatus = "new" | "accepted" | "rejected" | "ready" | "completed";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "pay_on_pickup" | "refunded";

export interface OrderItemModifier {
  groupId: string;
  optionId: string;
  name: string;
  price: number;
  kind: "add" | "remove" | "choice";
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // basispris + tilvalg
  modifiers: OrderItemModifier[];
  note?: string;
  lineTotal: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: number;
  source: OrderSource;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: "DKK";
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  note?: string;
  requestedTime?: string;
  /** Bordnummer ved QR/NFC-bestilling i restauranten. */
  tableNumber?: string;
  externalRefs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "seated" | "no_show";

export interface Booking {
  id: string;
  restaurantId: string;
  reference: string;
  source: OrderSource;
  status: BookingStatus;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  customer: CustomerInfo;
  comment?: string;
  externalRefs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string;
  orderCount: number;
  bookingCount: number;
  totalSpent: number;
  lastSeenAt: string;
}

export type IntegrationKind = "aibooking_orders" | "shopify" | "stripe" | "booking_system" | "custom_api";

export interface IntegrationStatus {
  kind: IntegrationKind;
  name: string;
  description: string;
  configured: boolean;
  enabled: boolean;
  details: string;
}

// Input-typer til API'et
export interface OrderItemInput {
  productId?: string;
  name?: string; // AI/voice kan sende et produktnavn i stedet for id
  quantity: number;
  modifierOptionIds?: string[];
  note?: string;
}

export interface CreateOrderInput {
  restaurantId: string;
  source?: OrderSource;
  fulfillment: FulfillmentType;
  customer: CustomerInfo;
  items: OrderItemInput[];
  paymentMethod?: PaymentMethod;
  note?: string;
  requestedTime?: string;
  tableNumber?: string;
  externalRefs?: Record<string, string>;
}

export interface CreateBookingInput {
  restaurantId: string;
  source?: OrderSource;
  date: string;
  time: string;
  partySize: number;
  customer: CustomerInfo;
  comment?: string;
}

export type CallOutcome = "order" | "booking" | "question" | "transfer" | "missed";

/** Indgående opkald håndteret af AI-receptionisten (AIbooking Voice). */
export interface Call {
  id: string;
  restaurantId: string;
  from: string;
  channel: "phone" | "voice_widget";
  startedAt: string;
  durationSec: number;
  outcome: CallOutcome;
  summary: string;
  transcript: { who: "customer" | "ai"; text: string }[];
  orderId?: string;
  bookingId?: string;
}
