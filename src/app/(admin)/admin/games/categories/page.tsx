import { redirect } from "next/navigation";

// Categories are now managed per game — redirect to the games list
export default function CategoriesPage() {
  redirect("/admin/games");
}
