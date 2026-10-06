import { supabase } from './supabase';
import type { PurchaseReceipt, PurchaseItemInput } from './database';

interface EmailPayload {
  recipientEmail: string;
  receipt: PurchaseReceipt;
  items: PurchaseItemInput[];
}

export const sendOrderConfirmationEmail = async (
  recipientEmail: string,
  receipt: PurchaseReceipt,
  items: PurchaseItemInput[]
) => {
  const payload: EmailPayload = {
    recipientEmail,
    receipt,
    items,
  };

  const functionAttempt = await supabase.functions.invoke('send-order-confirmation-email', {
    body: payload,
  });

  if (functionAttempt.error) {
    console.warn('Supabase function failed:', functionAttempt.error);
    throw new Error((functionAttempt.error as any)?.message || JSON.stringify(functionAttempt.error));
  }

  return functionAttempt.data;
};
