"use client";

import type { Customer } from "@/lib/types";
import { kr, timeAgo } from "@/lib/format";
import { useAdmin, usePoll } from "@/components/admin/AdminContext";
import { PageTitle } from "@/components/admin/AdminShell";
import { useI18n, useT } from "@/components/i18n/I18nProvider";

export default function CustomersPage() {
  const { t, locale } = useI18n();
  const { restaurant } = useAdmin();
  const { data } = usePoll<Customer[]>(restaurant ? `/api/customers?restaurantId=${restaurant.id}` : null, 15000);
  const list = data ?? [];
  return (
    <>
      <PageTitle title={t("Kunder")} text={t("Kunder oprettes automatisk når de bestiller eller booker – uanset kanal. Data tilhører kun denne restaurant.")} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-white/8 text-left text-xs text-ink-400">
            <tr><th className="p-4 font-medium">{t("Navn")}</th><th className="p-4 font-medium">{t("Kontakt")}</th><th className="p-4 font-medium">{t("Ordrer")}</th><th className="p-4 font-medium">{t("Bookinger")}</th><th className="p-4 font-medium">{t("Omsætning")}</th><th className="p-4 font-medium">{t("Senest")}</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((c) => (
              <tr key={c.id}>
                <td className="p-4 font-semibold">{c.name}</td>
                <td className="p-4 text-ink-300">{c.phone}{c.email && <span className="block text-xs text-ink-400">{c.email}</span>}</td>
                <td className="p-4 tabular-nums">{c.orderCount}</td>
                <td className="p-4 tabular-nums">{c.bookingCount}</td>
                <td className="p-4 tabular-nums">{kr(c.totalSpent)}</td>
                <td className="p-4 text-ink-400">{timeAgo(c.lastSeenAt, locale)}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-ink-400">{t("Ingen kunder endnu")}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
