import { NextRequest, NextResponse } from "next/server";

import { ADMIN_PREVIEW_COOKIE, loadCustomersList } from "../_lib";

function escapeCsv(value: string | number): string {
  const raw = String(value ?? "");
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await loadCustomersList();
    const header = [
      "Customer ID",
      "Company",
      "Email",
      "Contacts",
      "Ad Accounts",
      "MRR",
      "Status",
      "Plan",
      "Next Billing",
    ];

    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.companyName,
          row.email,
          row.contacts,
          row.adAccounts,
          row.mrr,
          row.status,
          row.plan,
          row.nextBillingLabel,
        ]
          .map(escapeCsv)
          .join(","),
      );
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=adalert-customers.csv",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to export customers" },
      { status: 500 },
    );
  }
}
