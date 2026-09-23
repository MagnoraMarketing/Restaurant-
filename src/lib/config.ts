// Offentlig (browser-sikker) konfiguration. Kun NEXT_PUBLIC_*-variabler her –
// ingen hemmeligheder må nogensinde læses i denne fil.
export const publicConfig = {
  // Standard: AIbooking test-widget, så restauranter kan prøve den live. Overstyr via env.
  widgetUrl: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_URL ?? "https://aibooking-backendnew.vercel.app/widget.js",
  widgetId: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_ID ?? "prfA6rbfVJC7K2",
  agentId: process.env.NEXT_PUBLIC_AIBOOKING_AGENT_ID || "",
  apiUrl: process.env.NEXT_PUBLIC_AIBOOKING_API_URL || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
};

export const isWidgetConfigured = () => Boolean(publicConfig.widgetUrl);
