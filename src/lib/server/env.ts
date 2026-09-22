// Server-side konfiguration. Denne fil må KUN importeres fra server-kode
// (route handlers, server components). Hemmeligheder læses fra environment
// variables og sendes aldrig til browseren.
const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === "" ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const serverEnv = {
  /** Offentlig demo: ingen login til /admin og API'et er åbent for læsning. */
  demoMode: bool(process.env.DEMO_MODE, true),
  defaultRestaurantSlug: process.env.DEFAULT_RESTAURANT_SLUG || "bella-napoli",
  /** Telefonnummer til AIbooking-demoen (vises i "Ring til demoen"). */
  demoPhone: process.env.AIBOOKING_DEMO_PHONE || "",

  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  adminApiKey: process.env.ADMIN_API_KEY || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET || "",

  webhookSigningSecret: process.env.AIBOOKING_WEBHOOK_SECRET || "",
  aibookingApiKey: process.env.AIBOOKING_API_KEY || "",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN || "",
  shopifyAdminToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
  shopifyWebhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || "",
  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2025-07",

  customOrderWebhookUrl: process.env.CUSTOM_ORDER_WEBHOOK_URL || "",
  customWebhookSecret: process.env.CUSTOM_WEBHOOK_SECRET || "",

  calcomApiKey: process.env.CALCOM_API_KEY || "",
  calcomEventTypeId: process.env.CALCOM_EVENT_TYPE_ID || "",
  bookingWebhookUrl: process.env.BOOKING_WEBHOOK_URL || "",
};

export const isSupabaseConfigured = () =>
  Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
