import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";

interface ContactIds {
  Pipedrive?: string;
  Mailchimp?: string;
  "Sendgrid Marketing"?: string;
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
      Pipedrive: userData.Pipedrive,
      Mailchimp: userData.Mailchimp,
      "Sendgrid Marketing": userData["Sendgrid Marketing"],
    };

    const removalResults = {
      Pipedrive: false,
      Mailchimp: false,
      SendGrid: false,
    };

    const errors: string[] = [];

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
