import { User } from "firebase/auth";

interface ContactIds {
  Pipedrive?: string;
  Mailchimp?: string;
  "Sendgrid Marketing"?: string;
}

interface ContactCreationResult {
  success: boolean;
  contactIds: ContactIds;
  errors: string[];
}

interface ContactRemovalResult {
  success: boolean;
  removalResults: {
    Pipedrive: boolean;
    Mailchimp: boolean;
    SendGrid: boolean;
  };
  errors: string[];
}

// Helper function to split name into first and last name
function splitName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: "" };
  }
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ");
  return { firstName, lastName };
}

// PipeDrive contact creation
async function createPipeDriveContact(
  email: string,
  name: string
): Promise<string | null> {
  try {
    const { firstName, lastName } = splitName(name);

    // First, try to find existing contact
    const searchResponse = await fetch(
      `https://api.pipedrive.com/v1/persons/search?term=${encodeURIComponent(
        email
      )}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.PIPEDRIVE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`PipeDrive search failed: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    // If contact exists, return the first match
    if (searchData.data && searchData.data.length > 0) {
      return searchData.data[0].id.toString();
    }

    // Create new contact
    const createResponse = await fetch("https://api.pipedrive.com/v1/persons", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PIPEDRIVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: firstName,
        email: [email],
        first_name: firstName,
        last_name: lastName,
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`PipeDrive create failed: ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    return createData.data.id.toString();
  } catch (error) {
    console.error("PipeDrive contact creation error:", error);
    return null;
  }
}

// MailChimp contact creation
async function createMailChimpContact(
  email: string,
  name: string
): Promise<string | null> {
  try {
    const { firstName, lastName } = splitName(name);
    const listId = process.env.MAILCHIMP_LIST_ID;
    const server = process.env.MAILCHIMP_SERVER;

    if (!listId || !server) {
      throw new Error("MailChimp configuration missing");
    }

    // First, try to find existing subscriber
    const crypto = await import("crypto");
    const subscriberHash = crypto
      .createHash("md5")
      .update(email.toLowerCase())
      .digest("hex");
    const searchUrl = `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;

    try {
      const searchResponse = await fetch(searchUrl, {
        headers: {
          "Authorization": `Bearer ${process.env.MAILCHIMP_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (searchResponse.ok) {
        const subscriberData = await searchResponse.json();
        return subscriberData.id;
      }
    } catch (error) {
      // 404 is expected if subscriber doesn't exist
      console.log("MailChimp subscriber not found, creating new one");
    }

    // Create new subscriber
    const createResponse = await fetch(
      `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.MAILCHIMP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
          },
        }),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(
        `MailChimp create failed: ${
          errorData.detail || createResponse.statusText
        }`
      );
    }

    const createData = await createResponse.json();
    return createData.id;
  } catch (error) {
    console.error("MailChimp contact creation error:", error);
    return null;
  }
}

// SendGrid contact creation
async function createSendGridContact(
  email: string,
  name: string
): Promise<string | null> {
  try {
    const { firstName, lastName } = splitName(name);
    const listId = process.env.SENDGRID_LIST_ID;

    if (!listId) {
      throw new Error("SendGrid list ID missing");
    }

    // First, try to find existing contact
    const searchResponse = await fetch(
      "https://api.sendgrid.com/v3/marketing/contacts/search/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: [email],
        }),
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.contact_count > 0) {
        return searchData.result[email]?.contact?.id || null;
      }
    }

    // Create new contact
    const createResponse = await fetch(
      "https://api.sendgrid.com/v3/marketing/contacts",
      {
        method: "PUT", // PUT is used for upsert in SendGrid
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
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
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(
        `SendGrid create failed: ${
          errorData.errors?.[0]?.message || createResponse.statusText
        }`
      );
    }

    const createData = await createResponse.json();
    return createData.job_id; // SendGrid returns job_id for contact creation
  } catch (error) {
    console.error("SendGrid contact creation error:", error);
    return null;
  }
}

// Main function to create contacts across all platforms
export async function createUserContacts(
  user: User,
  userName: string
): Promise<ContactCreationResult> {
  const contactIds: ContactIds = {};
  const errors: string[] = [];

  try {
    // Create contacts in parallel
    const [pipedriveId, mailchimpId, sendgridId] = await Promise.allSettled([
      createPipeDriveContact(user.email!, userName),
      createMailChimpContact(user.email!, userName),
      createSendGridContact(user.email!, userName),
    ]);

    // Handle PipeDrive result
    if (pipedriveId.status === "fulfilled" && pipedriveId.value) {
      contactIds.Pipedrive = pipedriveId.value;
    } else if (pipedriveId.status === "rejected") {
      errors.push(`PipeDrive: ${pipedriveId.reason}`);
    }

    // Handle MailChimp result
    if (mailchimpId.status === "fulfilled" && mailchimpId.value) {
      contactIds.Mailchimp = mailchimpId.value;
    } else if (mailchimpId.status === "rejected") {
      errors.push(`MailChimp: ${mailchimpId.reason}`);
    }

    // Handle SendGrid result
    if (sendgridId.status === "fulfilled" && sendgridId.value) {
      contactIds["Sendgrid Marketing"] = sendgridId.value;
    } else if (sendgridId.status === "rejected") {
      errors.push(`SendGrid: ${sendgridId.reason}`);
    }

    return {
      success: Object.keys(contactIds).length > 0,
      contactIds,
      errors,
    };
  } catch (error) {
    console.error("Error creating user contacts:", error);
    return {
      success: false,
      contactIds: {},
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Main function to remove contacts across all platforms
export async function removeUserContacts(
  contactIds: ContactIds
): Promise<ContactRemovalResult> {
  const removalResults = {
    Pipedrive: false,
    Mailchimp: false,
    SendGrid: false,
  };
  const errors: string[] = [];

  try {
    // Remove contacts in parallel
    const removalPromises = [];

    if (contactIds.Pipedrive) {
      removalPromises.push(
        removePipeDriveContact(contactIds.Pipedrive).then((success) => {
          removalResults.Pipedrive = success;
          if (!success) errors.push("Failed to remove PipeDrive contact");
        })
      );
    }

    if (contactIds.Mailchimp) {
      removalPromises.push(
        removeMailChimpContact(contactIds.Mailchimp).then((success) => {
          removalResults.Mailchimp = success;
          if (!success) errors.push("Failed to remove MailChimp contact");
        })
      );
    }

    if (contactIds["Sendgrid Marketing"]) {
      removalPromises.push(
        removeSendGridContact(contactIds["Sendgrid Marketing"]).then(
          (success) => {
            removalResults.SendGrid = success;
            if (!success) errors.push("Failed to remove SendGrid contact");
          }
        )
      );
    }

    // Wait for all removal operations to complete
    await Promise.all(removalPromises);

    return {
      success: Object.values(removalResults).some(Boolean),
      removalResults,
      errors,
    };
  } catch (error) {
    console.error("Error removing user contacts:", error);
    return {
      success: false,
      removalResults,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Helper function to remove PipeDrive contact
async function removePipeDriveContact(contactId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.pipedrive.com/v1/persons/${contactId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${process.env.PIPEDRIVE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("PipeDrive contact removal error:", error);
    return false;
  }
}

// Helper function to remove MailChimp subscriber
async function removeMailChimpContact(contactId: string): Promise<boolean> {
  try {
    const listId = process.env.MAILCHIMP_LIST_ID;
    const server = process.env.MAILCHIMP_SERVER;

    if (!listId || !server) {
      throw new Error("MailChimp configuration missing");
    }

    const response = await fetch(
      `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${contactId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${process.env.MAILCHIMP_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("MailChimp contact removal error:", error);
    return false;
  }
}

// Helper function to remove SendGrid contact
async function removeSendGridContact(contactId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.sendgrid.com/v3/marketing/contacts`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_ids: [contactId],
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("SendGrid contact removal error:", error);
    return false;
  }
}
