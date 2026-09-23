import { redirect } from "next/navigation";

/**
 * Kort URL til QR-koder og NFC-chips på bordene: /m/bella-napoli?bord=5
 * Sender gæsten til restaurantens online menukort med bordnummeret sat.
 */
export default async function ShortMenuLink({ params, searchParams }: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const bord = (await searchParams).bord;
  const table = typeof bord === "string" && /^\d{1,3}$/.test(bord) ? `?bord=${bord}` : "";
  redirect(`/demo/${slug}${table}#menu`);
}
