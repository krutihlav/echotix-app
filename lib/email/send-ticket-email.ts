// Cesta v projektu: lib/email/send-ticket-email.ts (nový soubor)

import { Resend } from 'resend'
import QRCode from 'qrcode'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendTicketEmailParams {
  to: string
  holderName: string
  eventName: string
  waveName: string      // typ vlny / tier
  eventDate: string      // předformátovaný string (viz formatEventDate ve webhooku)
  ticketCode: string     // "DUB-XXXX-XXXX"
  ticketUrl: string      // https://echotix-app.vercel.app/ticket/DUB-XXXX-XXXX
}

export async function sendTicketEmail(params: SendTicketEmailParams) {
  const {
    to, holderName, eventName, waveName,
    eventDate, ticketCode, ticketUrl,
  } = params

  // QR kóduje jen samotný kód lístku - stejný formát, jaký čte check_in_ticket (p_code)
  const qrBuffer = await QRCode.toBuffer(ticketCode, {
    width: 400,
    margin: 1,
  })

  const html = buildTicketEmailHtml({
    holderName, eventName, waveName, eventDate, ticketCode, ticketUrl,
  })

  const { data, error } = await resend.emails.send({
    // TODO: až bude ověřená dubtix.cz, změnit na 'Dubtix <tickets@dubtix.cz>'
    from: 'Dubtix <onboarding@resend.dev>',
    to: [to],
    subject: `Tvoje vstupenka — ${eventName}`,
    html,
    attachments: [
      {
        content: qrBuffer.toString('base64'),
        filename: 'qr-kod.png',
        contentId: 'ticket-qr',
      },
    ],
  })

  if (error) {
    // Nechceme shodit webhook kvůli chybě e-mailu - lístek už existuje, jen zalogujeme
    console.error('sendTicketEmail failed:', error)
    return { success: false, error }
  }

  return { success: true, id: data?.id }
}

function buildTicketEmailHtml(p: {
  holderName: string
  eventName: string
  waveName: string
  eventDate: string
  ticketCode: string
  ticketUrl: string
}) {
  return `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background:#0a0a0a; color:#f2f2f2; padding: 32px 24px; border-radius: 12px;">
    <p style="letter-spacing: 2px; font-size: 12px; text-transform: uppercase; color:#f0a500; margin: 0 0 4px;">Dubtix</p>
    <h1 style="font-size: 22px; margin: 0 0 24px;">${escapeHtml(p.eventName)}</h1>

    <p style="margin: 0 0 4px; color:#999; font-size: 13px;">Držitel</p>
    <p style="margin: 0 0 16px; font-size: 16px;">${escapeHtml(p.holderName)}</p>

    <p style="margin: 0 0 4px; color:#999; font-size: 13px;">Vlna</p>
    <p style="margin: 0 0 16px; font-size: 16px;">${escapeHtml(p.waveName)}</p>

    <p style="margin: 0 0 4px; color:#999; font-size: 13px;">Datum</p>
    <p style="margin: 0 0 24px; font-size: 16px;">${escapeHtml(p.eventDate)}</p>

    <div style="text-align:center; background:#111; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <img src="cid:ticket-qr" alt="QR kód vstupenky" width="220" height="220" style="display:block; margin:0 auto;" />
      <p style="font-family: monospace; font-size: 14px; letter-spacing: 1px; margin: 12px 0 0; color:#f0a500;">${escapeHtml(p.ticketCode)}</p>
    </div>

    <a href="${p.ticketUrl}" style="display:block; text-align:center; color:#f0a500; text-decoration:none; font-size: 14px;">
      Zobrazit vstupenku online →
    </a>
  </div>`
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
