'use client'
import { QRCodeSVG } from 'qrcode.react'

export default function TicketQR({ code }: { code: string }) {
  return (
    <QRCodeSVG
      value={code}
      size={180}
      bgColor="#F4E9D6"
      fgColor="#14100D"
      level="M"
      marginSize={0}
    />
  )
}
