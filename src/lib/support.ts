import { supabase } from "./supabase";

export const addAutomatedWelcomeResponse = async (ticketId: string) => {
  try {
    // Use a system account ID or create a dedicated support bot account
    const SYSTEM_ACCOUNT_ID = "your-support-bot-id"; // Replace with a real ID
    
    const { error } = await supabase
      .from("ticket_responses")
      .insert({
        ticket_id: ticketId,
        responder_id: SYSTEM_ACCOUNT_ID,
        response: `Thank you for submitting your support request. Our team has received your ticket and will respond as soon as possible.

In the meantime:
- Your ticket ID is #${ticketId.substring(0, 8)}
- You can add additional information to this ticket at any time
- Our typical response time is within 24 hours during business days

We appreciate your patience.

The Support Team`,
        is_internal: false,
      });

    if (error) {
      console.error('Error adding automated welcome response:', error);
    }
    
    return { error };
  } catch (e) {
    console.error('Exception in addAutomatedWelcomeResponse:', e);
    return { error: e };
  }
}; 