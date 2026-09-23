import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OFFERINGS, VENUE_TYPES, getVenueType } from "@/lib/demo/catalog";
import { FoodImage } from "@/components/ui/FoodImage";
import { Icon } from "@/components/ui/Icon";
import { ConversationDemo } from "@/components/landing/ConversationDemo";
import { OpenReceptionistButton } from "@/components/landing/OpenButton";
import { QrNfcVisual } from "@/components/landing/Visuals";
import { getT } from "@/lib/i18n/server";

export function generateStaticParams() {
  return VENUE_TYPES.map((v) => ({ type: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/brancher/[type]">): Promise<Metadata> {
  const v = getVenueType((await params).type);
  const { t } = await getT();
  return v ? { title: t("AI-receptionist til {plural}", { plural: t(v.plural) }), description: t(v.intro) } : {};
}

const FEATURE_LABELS = [
  { key: "booking", emoji: "🍽️", label: "Bordreservation", text: "Book, ændr og annullér borde" },
  { key: "orders", emoji: "🧾", label: "Bestillinger", text: "Ordrer direkte til køkkenet" },
  { key: "takeaway", emoji: "🥡", label: "Takeaway", text: "Afhentning med ventetid" },
  { key: "delivery", emoji: "🛵", label: "Levering", text: "Leveringsområder og gebyr" },
  { key: "qr", emoji: "📱", label: "QR/NFC på bordet", text: "Online menukort pr. bord" },
] as const;

export default async function VenueTypePage({ params }: PageProps<"/brancher/[type]">) {
  const { t } = await getT();
  const v = getVenueType((await params).type);
  if (!v) notFound();
  const others = VENUE_TYPES.filter((x) => x.slug !== v.slug);
  const lastAi = [...v.call].reverse().find((l) => l.who === "AI");

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <FoodImage src={v.image} alt={t(v.name)} emoji={v.emoji} className="absolute inset-0 h-full w-full" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="container-x relative flex min-h-[640px] flex-col justify-center pt-28 pb-16">
          <Link href="/#brancher" className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-ink-300 hover:text-white">
            <Icon name="back" className="h-4 w-4" /> {t("Alle typer")}
          </Link>
          <span className="eyebrow w-fit">{v.emoji} {t("AI-receptionist til {plural}", { plural: t(v.plural) })}</span>
          <h1 className="h-display mt-5 max-w-3xl text-4xl sm:text-6xl">{t(v.headline)}</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">{t(v.intro)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/demo/${v.demoSlug}`} className="btn-primary !px-6 !py-3.5 text-base">{t("Se demoen")} <Icon name="arrow" className="h-4 w-4" /></Link>
            <OpenReceptionistButton voice className="btn-secondary !px-6 !py-3.5 text-base"><Icon name="mic" className="h-4 w-4" /> {t("Tal med AI'en")}</OpenReceptionistButton>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {FEATURE_LABELS.map((f) => {
              const on = v.features[f.key];
              return (
                <span key={f.key} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${on ? "bg-white/12 text-white ring-1 ring-white/20" : "bg-white/5 text-white/35 line-through"}`}>
                  {f.emoji} {t(f.label)}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* SAMTALE + HVAD AI KAN */}
      <section className="container-x py-20">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">{t("Indgående opkald")}</span>
            <h2 className="h-display mt-5 text-4xl">{t("Sådan lyder et opkald")} – {t(v.name)}</h2>
            <p className="mt-4 text-ink-300">{t("AI-receptionisten tager telefonen og voice-widget'en med restaurantens egen viden: menu, priser, åbningstider, regler og allergener.")}</p>
            <h3 className="mt-10 text-sm font-bold tracking-wider text-ink-400 uppercase">{t("AI'en kan")}</h3>
            <ul className="mt-3 grid gap-2">
              {v.aiCan.map((a) => (
                <li key={a} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink-900 px-4 py-3 text-sm">
                  <Icon name="check" className="h-4 w-4 text-ember-400" /> {t(a)}
                </li>
              ))}
            </ul>
            <h3 className="mt-10 text-sm font-bold tracking-wider text-ink-400 uppercase">{t("Typiske spørgsmål den besvarer")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {v.questions.map((q) => (
                <OpenReceptionistButton key={q} message={t(q)} className="chip hover:border-ember-500/50 hover:text-white">
                  “{t(q)}”
                </OpenReceptionistButton>
              ))}
            </div>
          </div>
          <ConversationDemo script={v.call} title={t("Indgående opkald · {name}", { name: t(v.name) })} doneTitle={t("Klaret af AI ✓")} doneText={lastAi?.text ?? ""} />
        </div>
      </section>

      {/* FUNKTIONER */}
      <section className="border-y border-white/8 bg-ink-900/40 py-20">
        <div className="container-x">
          <h2 className="h-display text-center text-4xl">{t("Det får I med AIbooking")}</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURE_LABELS.map((f) => {
              const on = v.features[f.key];
              return (
                <div key={f.key} className={`card p-6 ${on ? "" : "opacity-45"}`}>
                  <span className="text-3xl">{f.emoji}</span>
                  <p className="mt-4 font-semibold">{t(f.label)}</p>
                  <p className="mt-1 text-sm text-ink-400">{t(f.text)}</p>
                  <p className={`mt-3 text-xs font-semibold ${on ? "text-emerald-300" : "text-ink-400"}`}>{on ? t("✓ Typisk brugt") : t("Kan tilvælges")}</p>
                </div>
              );
            })}
          </div>
          {v.features.qr && (
            <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h3 className="h-display text-3xl">{t("📱 QR-kode & NFC-anmeldelser")}</h3>
                <p className="mt-3 text-ink-300">{t("Gæsten scanner QR-koden, ser menukortet og bestiller – ordren kommer i køkkenet med bordnummer. NFC-chippen sender gæsten direkte til jeres anmeldelsesside.")}</p>
                <p className="mt-3 text-sm font-semibold text-ember-300">{t("QR-kode til print 30 € pr. stk. · NFC-chip til anmeldelser 30 € pr. stk.")}</p>
                <Link href={`/m/${v.demoSlug}?bord=4`} className="btn-primary mt-6">{t("Prøv som gæst ved bord 4")}</Link>
              </div>
              <QrNfcVisual slug={v.demoSlug} table={4} />
            </div>
          )}
        </div>
      </section>

      {/* LØSNINGER + CTA */}
      <section className="container-x py-20">
        <h2 className="h-display text-center text-4xl">{t("Samarbejdsmuligheder")}</h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OFFERINGS.map((o) => (
            <Link key={o.key} href={`/#${o.key}`} className="card flex items-center gap-3 p-4 transition hover:border-ember-500/40">
              <span className="text-2xl">{o.emoji}</span>
              <span>
                <span className="block text-sm font-semibold">{t(o.title)}</span>
                <span className="text-xs text-ink-400">{t(o.short)}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-14 rounded-[36px] bg-gradient-to-br from-ember-500 to-ember-700 p-10 text-center sm:p-14">
          <h2 className="h-display text-3xl sm:text-4xl">{t("Klar til at give jeres sted en AI-receptionist?")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{t("Vi sætter det op med jeres menu, åbningstider og telefonnummer – og viser det på et demo-møde.")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/kontakt?type=${v.slug}`} className="btn bg-white !px-7 !py-3.5 text-ink-950 hover:bg-cream">{t("Book demo")}</Link>
            <Link href={`/demo/${v.demoSlug}`} className="btn border border-white/40 !px-7 !py-3.5 text-white hover:bg-white/10">{t("Prøv demoen")}</Link>
          </div>
        </div>
        <div className="mt-14">
          <p className="text-center text-sm text-ink-400">{t("Andre typer")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {others.map((o) => (
              <Link key={o.slug} href={`/brancher/${o.slug}`} className="chip hover:text-white">{o.emoji} {t(o.name)}</Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
