import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyMapPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/proyecto/${id}/estructura`);
}
