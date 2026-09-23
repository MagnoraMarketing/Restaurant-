import type { Restaurant } from "@/lib/types";

/** Fjerner intet hemmeligt i dag, men er det ene sted der styrer hvad der må eksponeres offentligt. */
export function toPublicRestaurant(r: Restaurant) {
  const { widget, ...rest } = r;
  return {
    ...rest,
    widget: {
      restaurantId: widget.restaurantId,
      agentId: widget.agentId,
      voiceAgentId: widget.voiceAgentId,
      chatAgentId: widget.chatAgentId,
      theme: widget.theme,
      accentColor: widget.accentColor,
      welcomeMessage: widget.welcomeMessage,
      position: widget.position,
      enabled: widget.enabled,
    },
  };
}
