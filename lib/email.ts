import { supabase } from './supabase';

// The server loads the order and recipient itself; only the order id is sent.
export const sendOrderConfirmationEmail = async (orderId: string) => {
  const { data, error } = await supabase.functions.invoke('send-order-confirmation-email', {
    body: { orderId },
  });

  if (error) {
    console.warn('Supabase function failed:', error);
    throw new Error((error as any)?.message || JSON.stringify(error));
  }

  return data;
};
