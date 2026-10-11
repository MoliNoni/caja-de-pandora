// @ts-nocheck
import { z } from 'npm:zod@3';
import { corsHeaders, getCaller, jsonResponse } from '../_shared/http.ts';

// The client sends only the order id; everything else is loaded server-side.
const bodySchema = z.object({ orderId: z.string().uuid() });

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const money = (value: unknown) => `$${Number(value).toFixed(2)}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return jsonResponse(req, { error: 'Method not allowed' }, 405);

  const caller = await getCaller(req);
  if (!caller) return jsonResponse(req, { error: 'Unauthorized' }, 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse(req, { error: 'Bad request' }, 400);

  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL');
  if (!apiKey || !senderEmail) {
    console.error('Missing config: BREVO_API_KEY and BREVO_SENDER_EMAIL are required');
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }

  try {
    // RLS limits this to the caller's own orders (admins see all, hence the user_id check below).
    const { data: order, error } = await caller.client
      .from('encabezados')
      .select(
        'id, total, fecha_creacion, cliente:cliente_id(email, user_id), detalles(cantidad, precio_unitario, subtotal, producto:producto_id(titulo))'
      )
      .eq('id', parsed.data.orderId)
      .maybeSingle();

    if (error || !order || order.cliente?.user_id !== caller.user.id || !order.cliente?.email) {
      return jsonResponse(req, { error: 'Not found' }, 404);
    }

    const lines = (order.detalles ?? []).map((d: any) => ({
      titulo: d.producto?.titulo ?? '',
      cantidad: d.cantidad,
      precio: d.precio_unitario,
      subtotal: d.subtotal,
    }));
    const fecha = new Date(order.fecha_creacion ?? Date.now()).toLocaleString('es-CO');

    const htmlContent = `
    <div style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1f2937;">
      <h1 style="color:#4b0082;">Confirmación de compra</h1>
      <p>Gracias por comprar en Librería Caja de Pandora.</p>
      <p><strong>Orden:</strong> ${escapeHtml(order.id)}</p>
      <p><strong>Fecha:</strong> ${escapeHtml(fecha)}</p>
      <p><strong>Total:</strong> ${escapeHtml(money(order.total))}</p>
      <h2>Detalle de productos</h2>
      <ul>${lines
        .map(
          (l: any) =>
            `<li>${escapeHtml(l.titulo)} x${escapeHtml(l.cantidad)} @ ${escapeHtml(money(l.precio))} = ${escapeHtml(money(l.subtotal))}</li>`
        )
        .join('')}</ul>
      <p>Esperamos verte pronto de nuevo.</p>
    </div>`;

    const textContent = `Gracias por su compra en Librería Caja de Pandora.\n\nOrden: ${order.id}\nFecha: ${fecha}\n\nDetalles:\n${lines
      .map((l: any) => `- ${l.titulo} x${l.cantidad} @ ${money(l.precio)} = ${money(l.subtotal)}`)
      .join('\n')}\n\nTotal: ${money(order.total)}\n\nEsperamos volver a verte pronto.`;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: {
          name: Deno.env.get('BREVO_SENDER_NAME') ?? 'Librería Caja de Pandora',
          email: senderEmail,
        },
        to: [{ email: order.cliente.email }],
        subject: 'Confirmación de compra - Librería Caja de Pandora',
        htmlContent,
        textContent,
      }),
    });

    if (!response.ok) {
      console.error('brevo failure', response.status, await response.text()); // Brevo's reason, e.g. unauthorised IP or unverified sender
      return jsonResponse(req, { error: 'Email delivery failed' }, 502);
    }
    return jsonResponse(req, { success: true });
  } catch (e) {
    console.error('send-order-confirmation-email error', e);
    return jsonResponse(req, { error: 'Internal error' }, 500);
  }
});
