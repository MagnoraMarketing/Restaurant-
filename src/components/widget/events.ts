"use client";

// Lille event-bus så enhver knap på siden kan åbne AI-receptionisten,
// evt. med en start-besked ("Book bord til 4 personer fredag kl. 19").
export const OPEN_EVENT = "aibooking:open";

export interface OpenDetail {
  message?: string;
  voice?: boolean;
}

export function openReceptionist(message?: string, opts: { voice?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail: { message, voice: opts.voice } }));
}
