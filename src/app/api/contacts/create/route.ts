import { NextRequest, NextResponse } from 'next/server';
import { User } from 'firebase/auth';

interface ContactIds {
  Mailchimp?: string;
  'Sendgrid Marketing'?: string;
}

interface ContactCreationResult {
  success: boolean;
  contactIds: ContactIds;
  errors: string[];
}

// Helper function to split name into first and last name
function splitName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '' };
  }
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  return { firstName, lastName };
}

export async function POST(request: NextRequest) {
  try {
    // Debug: Log all environment variables
    // console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
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
    // console.log("=====================================");

    const { user, userName, email: directEmail } = await request.json();
    // console.log("user", user);
    // console.log("userName", userName);
    // console.log("directEmail", directEmail);

    if (!userName) {
      return NextResponse.json(
        { success: false, error: 'userName is required' },
        { status: 400 },
      );
    }

    // Try to get email from multiple sources
    let email = directEmail || user?.email || 'test@example.com';
    // console.log("Final email used:", email);

    const { firstName, lastName } = splitName(userName);
    const contactIds: ContactIds = {};
    const errors: string[] = [];

    // Create contacts in parallel across all platforms
    const [mailchimpResult, sendgridResult] = await Promise.allSettled([
      // MailChimp contact creation
      (async () => {
        try {
          const listId = process.env.MAILCHIMP_LIST_ID;
          const server = process.env.MAILCHIMP_SERVER;

          // console.log("MAILCHIMP listId", listId);
          // console.log("MAILCHIMP server", server);

          if (!listId || !server) {
            throw new Error('MailChimp configuration missing');
          }

          // First, try to find existing subscriber
          const crypto = await import('crypto');
          const subscriberHash = crypto
            .createHash('md5')
            .update(email.toLowerCase())
            .digest('hex');
          const searchUrl = `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;

          try {
            const searchResponse = await fetch(searchUrl, {
              headers: {
                'Authorization': `Bearer ${process.env.MAILCHIMP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });

            if (searchResponse.ok) {
              const subscriberData = await searchResponse.json();
              return subscriberData.id;
            }
          } catch (error) {
            // 404 is expected if subscriber doesn't exist
            // console.log("MailChimp subscriber not found, creating new one");
          }

          // Create new subscriber
          const createResponse = await fetch(
            `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.MAILCHIMP_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email_address: email,
                status: 'subscribed',
                merge_fields: {
                  FNAME: firstName,
                  LNAME: lastName,
                },
              }),
            },
          );

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(
              `MailChimp create failed: ${
                errorData.detail || createResponse.statusText
              }`,
            );
          }

          const createData = await createResponse.json();
          return createData.id;
        } catch (error) {
          console.error('MailChimp contact creation error:', error);
          throw error;
        }
      })(),

      // SendGrid contact creation
      (async () => {
        try {
          const listId = process.env.SENDGRID_LIST_ID;
          const apiKey = process.env.SENDGRID_API_KEY;

          // console.log("SENDGRID listId", listId);
          // console.log(
          //   "SENDGRID API_KEY length:",
          //   apiKey ? apiKey.length : "undefined"
          // );

          if (!listId) {
            throw new Error('SendGrid list ID missing');
          }

          if (!apiKey) {
            throw new Error('SendGrid API key missing');
          }

          // First, try to find existing contact
          // console.log("Searching for existing SendGrid contact...");
          const searchResponse = await fetch(
            'https://api.sendgrid.com/v3/marketing/contacts/search/emails',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                emails: [email],
              }),
            },
          );

          // console.log(
          //   "SendGrid search response status:",
          //   searchResponse.status
          // );
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            // console.log("SendGrid search response:", searchData);
            if (searchData.contact_count > 0) {
              // console.log("SendGrid contact found, returning ID");
              return searchData.result[email]?.contact?.id || null;
            }
          } else {
            const searchErrorText = await searchResponse.text();
            // console.log("SendGrid search error response:", searchErrorText);
            // Don't throw here, just log and continue to create
          }

          // Create new contact
          // console.log("Creating new SendGrid contact...");
          const createResponse = await fetch(
            'https://api.sendgrid.com/v3/marketing/contacts',
            {
              method: 'PUT', // PUT is used for upsert in SendGrid
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contacts: [
                  {
                    email: email,
                    first_name: firstName,
                    last_name: lastName,
                  },
                ],
                list_ids: [listId],
              }),
            },
          );

          // console.log(
          //   "SendGrid create response status:",
          //   createResponse.status
          // );
          if (!createResponse.ok) {
            const errorData = await createResponse.text();
            // console.log("SendGrid create error response:", errorData);

            // Provide more helpful error messages
            if (createResponse.status === 403) {
              throw new Error(
                'SendGrid API key lacks required permissions. Please ensure your API key has "Marketing Campaigns" access enabled. See: https://docs.sendgrid.com/api-reference/how-to-use-the-sendgrid-v3-api/authorization#api-key-permissions-list',
              );
            } else if (createResponse.status === 401) {
              throw new Error('SendGrid API key is invalid or expired');
            } else {
              throw new Error(
                `SendGrid create failed: ${createResponse.status} ${createResponse.statusText}`,
              );
            }
          }

          const createData = await createResponse.json();
          // console.log("SendGrid create success response:", createData);
          return email; // Return email instead of job_id for removal purposes
        } catch (error) {
          console.error('SendGrid contact creation error:', error);
          throw error;
        }
      })(),
    ]);

    // Handle MailChimp result
    if (mailchimpResult.status === 'fulfilled' && mailchimpResult.value) {
      contactIds.Mailchimp = mailchimpResult.value;
    } else if (mailchimpResult.status === 'rejected') {
      errors.push(`MailChimp: ${mailchimpResult.reason}`);
    }

    // Handle SendGrid result
    if (sendgridResult.status === 'fulfilled' && sendgridResult.value) {
      contactIds['Sendgrid Marketing'] = sendgridResult.value;
    } else if (sendgridResult.status === 'rejected') {
      errors.push(`SendGrid: ${sendgridResult.reason}`);
    }

    const result: ContactCreationResult = {
      success: Object.keys(contactIds).length > 0,
      contactIds,
      errors,
    };

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error creating user contacts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}
