import type { Metadata } from "next";
import { LeadForm } from "@/components/forms/LeadForm";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Book demo") };
}

export default async function ContactPage({ searchParams }: PageProps<"/kontakt">) {
  const pakke = (await searchParams).pakke;
  const preselect = typeof pakke === "string" ? [pakke] : [];
  const { t } = await getT();
  return (
    <section className="container-x grid gap-12 pt-32 pb-24 lg:grid-cols-2">
      <div>
        <span className="eyebrow">{t("Book demo")}</span>
        <h1 className="h-display mt-5 text-4xl sm:text-5xl">{t("Se AIbooking på din egen restaurant")}</h1>
        <p className="mt-4 text-lg text-ink-300">
          {t("På 20 minutter viser vi, hvordan AI-receptionisten tager telefonen, modtager bestillinger og booker borde – med din menu, dine åbningstider og dit brand.")}
        </p>
        <ul className="mt-8 space-y-3 text-ink-300">
          <li>{t("✓ Vi opsætter en AI-agent med din menu inden mødet")}</li>
          <li>{t("✓ Du får dit eget demo-telefonnummer at ringe til")}</li>
          <li>{t("✓ Vi viser integration til dit nuværende system")}</li>
        </ul>
      </div>
      <LeadForm preselect={preselect} />
    </section>
  );
}
