import type { NewSupportTicketForm } from "./types";

type SuggestedTicketPayload = Omit<NewSupportTicketForm, "attachment">;

export interface AlertTicketSuggestion extends SuggestedTicketPayload {
  id: string;
  alertTitle: string;
}

export const ALERT_TICKET_SUGGESTIONS: AlertTicketSuggestion[] = [
  {
    id: "low-ctr",
    alertTitle: "Low CTR trend",
    subject: "Low CTR trend in active campaigns",
    category: "alerts",
    priority: "medium",
    description:
      "I received a low CTR alert. Please review likely causes and suggest campaign-level actions to improve click-through rate.",
  },
  {
    id: "budget-limited",
    alertTitle: "Budget capped",
    subject: "Campaign budget limited by spend cap",
    category: "ads-account",
    priority: "high",
    description:
      "A budget-related alert indicates campaigns are limited. I need guidance on where to increase budget and expected impact.",
  },
  {
    id: "conversion-drop",
    alertTitle: "Conversion drop",
    subject: "Sudden conversion drop after recent changes",
    category: "dashboard",
    priority: "high",
    description:
      "I noticed a conversion drop alert. Please help investigate potential causes and share recommended checks and fixes.",
  },
];
