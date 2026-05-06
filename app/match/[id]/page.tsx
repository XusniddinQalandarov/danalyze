import { notFound } from "next/navigation";
import MatchClientView from "./MatchClientView";
import { getMatchViewerById } from "@/lib/server/matches";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const match = await getMatchViewerById(id);

  if (!match) notFound();
  return <MatchClientView match={match} />;
}
