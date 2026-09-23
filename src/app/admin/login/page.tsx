"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/site/Logo";
import { useT } from "@/components/i18n/I18nProvider";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <form
        className="card w-full max-w-sm space-y-4 p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          const res = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
          if (res.ok) router.push("/admin");
          else setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? t("Login fejlede"));
        }}
      >
        <Logo sub={false} />
        <h1 className="h-display text-2xl">{t("Log ind på admin")}</h1>
        <input type="password" className="input" placeholder={t("Adgangskode")} value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <p className="text-sm text-red-300">{err}</p>}
        <button className="btn-primary w-full">{t("Log ind")}</button>
      </form>
    </div>
  );
}
