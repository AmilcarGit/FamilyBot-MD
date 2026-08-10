import { obtenerUsuario, formatearTiempoRestante } from '../../lib/economia.js'

export const desc = 'Muestra tu inventario de items comprados'
export const cooldown = 3

export default async function inventario({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const eco = await obtenerUsuario(db, jidRemitente)

  const items = []

  if (eco.escudoHasta > Date.now()) {
    const restante = formatearTiempoRestante(eco.escudoHasta - Date.now())
    items.push(`🛡️ Escudo antirrobo — activo por ${restante} más`)
  }

  if (eco.amuletoActivo) items.push('🍀 Amuleto de suerte — listo para tu próxima actividad')
  if (eco.multiplicadorActivo) items.push('✨ Multiplicador diario — listo para tu próximo diario')

  if (!items.length) {
    return sock.sendMessage(chatId, { text: '🎒 Tu inventario está vacío. Usa *tienda* para comprar algo.' })
  }

  await sock.sendMessage(chatId, { text: `🎒 *Tu inventario*\n\n${items.join('\n')}` })
}