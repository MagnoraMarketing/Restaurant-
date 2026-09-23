import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurant, repo } from "@/lib/server/repository";
import { RestaurantShell } from "@/components/restaurant/RestaurantShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps<"/demo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  return r ? { title: { default: `${r.name} – ${r.tagline}`, template: `%s · ${r.name}` }, description: r.description } : {};
}

export default async function RestaurantLayout({ children, params }: LayoutProps<"/demo/[slug]">) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();
  const menu = await repo().getMenu(restaurant.id);
  return (
    <RestaurantShell restaurant={restaurant} menu={menu}>
      {children}
    </RestaurantShell>
  );
}
