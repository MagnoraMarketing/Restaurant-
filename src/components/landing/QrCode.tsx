"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Rigtig, scanbar QR-kode (SVG) – bruges på bordkort og i admin. */
export function QrCode({ value, className = "", dark = "#0b0b0c", light = "#ffffff" }: { value: string; className?: string; dark?: string; light?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    const url = value.startsWith("http") ? value : `${window.location.origin}${value}`;
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark, light }, errorCorrectionLevel: "M" }).then(setSvg).catch(() => setSvg(""));
  }, [value, dark, light]);
  return <div className={`[&>svg]:h-full [&>svg]:w-full ${className}`} aria-label={`QR-kode til ${value}`} role="img" dangerouslySetInnerHTML={{ __html: svg }} />;
}
