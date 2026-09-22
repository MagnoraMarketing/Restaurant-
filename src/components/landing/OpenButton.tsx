"use client";

import { openReceptionist } from "@/components/widget/events";

/** Knap der åbner AI-receptionisten (evt. med start-besked). */
export function OpenReceptionistButton({
  message,
  voice,
  className,
  style,
  children,
}: {
  style?: React.CSSProperties;
  message?: string;
  voice?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => openReceptionist(message, { voice })} className={className} style={style}>
      {children}
    </button>
  );
}
