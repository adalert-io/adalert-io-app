import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";

interface ContactIds {
  Mailchimp?: string;
  "Sendgrid Marketing"?: string;
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
    // Since SendGrid contact creation returns job_id, not contact ID,
    // we need to use email-based removal or get the actual contact ID
    // For now, let's assume the contactId contains the email
    const email = contactId;

    console.log("Removing SendGrid contact by email:", email);

    // First, try to find the contact by email to get the actual contact ID
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
      console.log("SendGrid search response for removal:", searchData);

      // Check if the contact exists in the result object
      const contactExists =
        searchData.result &&
        searchData.result[email] &&
        searchData.result[email].contact;
      console.log("Contact exists check:", contactExists);

      if (contactExists) {
        const actualContactId = searchData.result[email]?.contact?.id;
        console.log("Extracted contact ID:", actualContactId);
        console.log("Full contact object:", searchData.result[email]?.contact);

        if (actualContactId) {
          console.log(
            "Found SendGrid contact ID for removal:",
            actualContactId
          );

          // Remove by contact ID
          const deleteResponse = await fetch(
            `https://api.sendgrid.com/v3/marketing/contacts?ids=${actualContactId}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          console.log(
            "SendGrid delete response status:",
            deleteResponse.status
          );

          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.log("SendGrid delete error response:", errorText);
          }

          return deleteResponse.ok;
        } else {
          console.log(
            "No contact ID found in search response, trying email-based removal"
          );
        }
      } else {
        console.log("No contacts found in search response");
      }
    } else {
      const searchErrorText = await searchResponse.text();
      console.log("SendGrid search error response:", searchErrorText);
    }

    // If we can't find the contact or get the ID, try email-based removal
    console.log("Trying email-based removal for SendGrid");
    const emailDeleteResponse = await fetch(
      `https://api.sendgrid.com/v3/marketing/contacts?emails=${encodeURIComponent(
        email
      )}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "SendGrid email delete response status:",
      emailDeleteResponse.status
    );

    if (!emailDeleteResponse.ok) {
      const errorText = await emailDeleteResponse.text();
      console.log("SendGrid email delete error response:", errorText);
    }

    return emailDeleteResponse.ok;
  } catch (error) {
    console.error("SendGrid contact removal error:", error);
    return false;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user document to retrieve contact IDs
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const contactIds: ContactIds = {
      Mailchimp: userData.Mailchimp,
      "Sendgrid Marketing": userData["Sendgrid Marketing"],
    };

    const removalResults = {
      Mailchimp: false,
      SendGrid: false,
    };

    const errors: string[] = [];

    // Remove contacts in parallel
    const removalPromises = [];

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

    // Delete the user document
    await deleteDoc(userRef);

    return NextResponse.json({
      success: true,
      removalResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error removing user contacts:", error);
    return NextResponse.json(
      { error: "Failed to remove user contacts", details: error.message },
      { status: 500 }
    );
  }
}
