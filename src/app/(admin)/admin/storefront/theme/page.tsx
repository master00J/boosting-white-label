import { redirect } from "next/navigation";

/** Legacy route — theme controls live on the visual builder with preview. */
export default function StorefrontThemeRedirectPage() {
  redirect("/admin/storefront/builder");
}
