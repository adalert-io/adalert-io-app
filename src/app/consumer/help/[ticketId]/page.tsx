import { ConsumerHelpTicketDetailPage } from "@/features/consumer/help";

export default async function ConsumerHelpTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <ConsumerHelpTicketDetailPage ticketId={ticketId} />;
}
