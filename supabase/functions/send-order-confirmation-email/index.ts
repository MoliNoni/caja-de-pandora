// @ts-nocheck
import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

interface PurchaseReceiptHeader {
  id: string;
  idCliente: string;
  fecha: string;
  subtotal: number;
  total: number;
  descuentoTotal: number;
}

interface PurchaseReceiptDetail {
  id: string;
  idEncabezado: string;
  idProducto: string;
  titulo: string;
  cantidad: number;
  valor: number;
  descuento: number;
  subtotal: number;
}

interface PurchaseReceipt {
  encabezado: PurchaseReceiptHeader;
  detalles: PurchaseReceiptDetail[];
}

interface PurchaseItemInput {
  id: string;
  titulo: string;
  precio: number;
  cantidad: number;
}

interface EmailRequest {
  recipientEmail: string;
  receipt: PurchaseReceipt;
  items: PurchaseItemInput[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const formatOrderText = (receipt: PurchaseReceipt, items: PurchaseItemInput[]) => {
  const itemsText = items
    .map(
      (item) =>
        `- ${item.titulo} x${item.cantidad} @ $${item.precio.toFixed(2)} = $${(
          item.precio * item.cantidad
        ).toFixed(2)}`
    )
    .join('\n');

  return `Gracias por su compra en Librería Caja de Pandora.\n\nOrden: ${receipt.encabezado.id}\nCliente: ${receipt.encabezado.idCliente}\nFecha: ${new Date(
    receipt.encabezado.fecha
  ).toLocaleString('es-CO')}\n\nDetalles:\n${itemsText}\n\nSubtotal: $${receipt.encabezado.subtotal.toFixed(
    2
  )}\nDescuento: $${receipt.encabezado.descuentoTotal.toFixed(2)}\nTotal: $${receipt.encabezado.total.toFixed(2)}\n\nEsperamos volver a verte pronto.`;
};

const formatOrderHtml = (receipt: PurchaseReceipt, items: PurchaseItemInput[]) => {
  const itemsHtml = items
    .map(
      (item) =>
        `<li>${item.titulo} x${item.cantidad} @ $${item.precio.toFixed(2)} = $${(
          item.precio * item.cantidad
        ).toFixed(2)}</li>`
    )
    .join('');

  return `
    <div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1f2937;">
      <h1 style="color:#4b0082;">Confirmación de compra</h1>
      <p>Gracias por comprar en Librería Caja de Pandora.</p>
      <p><strong>Orden:</strong> ${receipt.encabezado.id}</p>
      <p><strong>Fecha:</strong> ${new Date(
        receipt.encabezado.fecha
      ).toLocaleString('es-CO')}</p>
      <p><strong>Total:</strong> $${receipt.encabezado.total.toFixed(2)}</p>
      <h2>Detalle de productos</h2>
      <ul>${itemsHtml}</ul>
      <p>Esperamos verte pronto de nuevo.</p>
    </div>
  `;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

  const rawBody = await req.json().catch(() => null);
  let body = rawBody;

  if (typeof rawBody === 'string') {
    body = JSON.parse(rawBody);
  }

  if (!body || typeof body.recipientEmail !== 'string') {
    return jsonResponse({ error: 'Bad request: recipientEmail missing' }, 400);
  }

  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'juanmolinalcgs@gmail.com';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'Librería Caja de Pandora';

  if (!apiKey) {
    return jsonResponse({ error: 'Server misconfiguration: BREVO_API_KEY is required' }, 500);
  }

  const emailRequest = body as EmailRequest;

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [{ email: emailRequest.recipientEmail }],
    subject: 'Confirmación de compra - Librería Caja de Pandora',
    htmlContent: formatOrderHtml(emailRequest.receipt, emailRequest.items),
    textContent: formatOrderText(emailRequest.receipt, emailRequest.items),
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.text();

  if (!response.ok) {
    return jsonResponse({ error: true, status: response.status, body: data }, response.status);
  }

    return jsonResponse({ success: true, body: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
