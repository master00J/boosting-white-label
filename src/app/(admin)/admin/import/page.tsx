import type { Metadata } from "next";
import ImportClient from "./import-client";

export const metadata: Metadata = { title: "Bulk import" };

export default function ImportPage() {
  return <ImportClient />;
}
