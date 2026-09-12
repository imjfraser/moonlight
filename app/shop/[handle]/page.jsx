import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readPublicShop, publicShopMetadata } from "../../lib/public-shop";
import ShopView from "../../components/ShopView";
import ShopLocaleSync from "../../components/ShopLocaleSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function pageLanguage(searchParams) {
  const search = await searchParams;
  if (search?.lang === "en" || search?.lang === "es") return search.lang;
  const stored = (await cookies()).get("moonlight.lang")?.value;
  return stored === "es" ? "es" : "en";
}

export async function generateMetadata({ params, searchParams }) {
  const { handle } = await params;
  const shop = readPublicShop(handle);
  if (!shop) notFound();
  return publicShopMetadata(shop, await pageLanguage(searchParams));
}

export default async function ShopPage({ params, searchParams }) {
  const { handle } = await params;
  const shop = readPublicShop(handle);
  if (!shop) notFound();
  const lang = await pageLanguage(searchParams);
  return <>
    <ShopLocaleSync lang={lang} />
    <ShopView shop={shop} lang={lang} />
  </>;
}
