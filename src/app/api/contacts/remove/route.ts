import { NextRequest, NextResponse } from 'next/server';

interface ContactIds {
  Mailchimp?: string;
  'Sendgrid Marketing'?: string;
}

interface ContactRemovalResult {
  success: boolean;
  removalResults: {
    Mailchimp: boolean;
    SendGrid: boolean;
  };
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Debug: Log all environment variables
    // console.log("=== ENVIRONMENT VARIABLES DEBUG (REMOVE) ===");
    // console.log(
    //   "MAILCHIMP_API_KEY:",
    //   process.env.MAILCHIMP_API_KEY ? "✅ Set" : "❌ Missing"
    // );
    // console.log(
    //   "MAILCHIMP_LIST_ID:",
    //   process.env.MAILCHIMP_LIST_ID ? "✅ Set" : "❌ Missing"
    // );
    // console.log(
    //   "MAILCHIMP_SERVER:",
    //   process.env.MAILCHIMP_SERVER ? "✅ Set" : "❌ Missing"
    // );
    // console.log(
    //   "SENDGRID_API_KEY:",
    //   process.env.SENDGRID_API_KEY ? "✅ Set" : "❌ Missing"
    // );
    // console.log(
    //   "SENDGRID_LIST_ID:",
    //   process.env.SENDGRID_LIST_ID ? "✅ Set" : "❌ Missing"
    // );
    // console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "Not set");
    // console.log("NODE_ENV:", process.env.NODE_ENV || "Not set");
    // console.log("==========================================");

    const { contactIds } = await request.json();

    if (!contactIds) {
      return NextResponse.json(
        { success: false, error: 'Contact IDs are required' },
        { status: 400 },
      );
    }

    const removalResults = {
      Mailchimp: false,
      SendGrid: false,
    };
    const errors: string[] = [];

    // Remove contacts in parallel across all platforms
    const [mailchimpResult, sendgridResult] = await Promise.allSettled([
      // Remove MailChimp subscriber
      (async () => {
        try {
          if (!contactIds.Mailchimp) return false;

          const listId = process.env.MAILCHIMP_LIST_ID;
          const server = process.env.MAILCHIMP_SERVER;

          if (!listId || !server) {
            throw new Error('MailChimp configuration missing');
          }

          const response = await fetch(
            `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${contactIds.Mailchimp}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${process.env.MAILCHIMP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            },
          );

          return response.ok;
        } catch (error) {
          console.error('MailChimp contact removal error:', error);
          return false;
        }
      })(),

      // Remove SendGrid contact
      (async () => {
        try {
          if (!contactIds['Sendgrid Marketing']) return false;

          // Since SendGrid contact creation returns job_id, not contact ID,
          // we need to use email-based removal or get the actual contact ID
          // For now, let's assume the contactIds['Sendgrid Marketing'] contains the email
          const email = contactIds['Sendgrid Marketing'];

          // console.log("Removing SendGrid contact by email:", email);

          // First, try to find the contact by email to get the actual contact ID
          const searchResponse = await fetch(
            'https://api.sendgrid.com/v3/marketing/contacts/search/emails',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                emails: [email],
              }),
            },
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            // console.log(
            //   "SendGrid search response for removal:",
            //   JSON.stringify(searchData, null, 2)
            // );

            // Check if the contact exists in the result object
            const contactExists =
              searchData.result &&
              searchData.result[email] &&
              searchData.result[email].contact;
            // console.log("Contact exists check:", contactExists);

            if (contactExists) {
              const contactId = searchData.result[email]?.contact?.id;
              // console.log("Extracted contact ID:", contactId);
              // console.log(
              //   "Full contact object:",
              //   searchData.result[email]?.contact
              // );

              if (contactId) {
                // console.log(
                //   "Found SendGrid contact ID for removal:",
                //   contactId
                // );

                // Remove by contact ID using query parameters
                const deleteResponse = await fetch(
                  `https://api.sendgrid.com/v3/marketing/contacts?ids=${contactId}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                  },
                );

                // console.log(
                //   "SendGrid delete response status:",
                //   deleteResponse.status
                // );

                if (!deleteResponse.ok) {
                  const errorText = await deleteResponse.text();
                  // console.log("SendGrid delete error response:", errorText);
                }

                return deleteResponse.ok;
              } else {
                // console.log(
                //   "No contact ID found in search response, trying email-based removal"
                // );
              }
            } else {
              // console.log("No contacts found in search response");
            }
          } else {
            const searchErrorText = await searchResponse.text();
            // console.log("SendGrid search error response:", searchErrorText);
          }

          // If we can't find the contact or get the ID, try email-based removal
          // console.log("Trying email-based removal for SendGrid");
          const emailDeleteResponse = await fetch(
            `https://api.sendgrid.com/v3/marketing/contacts?emails=${encodeURIComponent(
              email,
            )}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
              },
            },
          );

          // console.log(
          //   "SendGrid email delete response status:",
          //   emailDeleteResponse.status
          // );

          if (!emailDeleteResponse.ok) {
            const errorText = await emailDeleteResponse.text();
            // console.log("SendGrid email delete error response:", errorText);
          }

          return emailDeleteResponse.ok;
        } catch (error) {
          console.error('SendGrid contact removal error:', error);
          return false;
        }
      })(),
    ]);

    // Handle MailChimp result
    if (mailchimpResult.status === 'fulfilled') {
      removalResults.Mailchimp = mailchimpResult.value;
      if (!mailchimpResult.value)
        errors.push('Failed to remove MailChimp contact');
    } else {
      errors.push(`MailChimp: ${mailchimpResult.reason}`);
    }

    // Handle SendGrid result
    if (sendgridResult.status === 'fulfilled') {
      removalResults.SendGrid = sendgridResult.value;
      if (!sendgridResult.value)
        errors.push('Failed to remove SendGrid contact');
    } else {
      errors.push(`SendGrid: ${sendgridResult.reason}`);
    }

    const result: ContactRemovalResult = {
      success: Object.values(removalResults).some(Boolean),
      removalResults,
      errors,
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error removing user contacts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}
