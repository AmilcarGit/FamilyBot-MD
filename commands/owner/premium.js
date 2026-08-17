import { obtenerJidMencionado, resolverNumeroReal } from '../../lib/utils.js'
import { otorgarPremium, quitarPremium, formatearVencimiento } from '../../lib/premium.js'

export const desc = 'Otorga o quita premium a un usuario. Uso: .premium @user 30 (días) | .premium @user 0 (para siempre) | .premium @user quitar'
export const alias = ['prem']
export const soloOwner = true
export const cooldown = 3

export default async function premium({ sock, msg, args, chatId, db }) {
  const jid = obtenerJidMencionado(msg, args)
  if (!jid) {
    return sock.sendMessage(chatId, {
      text:
        '🌟 *Gestión de Premium*\n\n' +
        `Menciona, responde o escribe el número, y luego:\n` +
        `• un número de días → *premium @user 30*\n` +
        `• *0* → premium para siempre → *premium @user 0*\n` +
        `• *quitar* → revocar → *premium @user quitar*`,
    })
  }

  const numero = await resolverNumeroReal(sock, jid)
  const quiereQuitar = args.some((a) => a.toLowerCase() === 'quitar')

  if (quiereQuitar) {
    await quitarPremium(db, jid)
    return sock.sendMessage(chatId, {
      text: `✅ Le quité el premium a @${numero}.`,
      mentions: [jid],
    })
  }

  const diasTexto = args.find((a) => /^\d{1,4}$/.test(a))
  const dias = diasTexto !== undefined ? parseInt(diasTexto, 10) : 30

  const resultado = await otorgarPremium(db, jid, dias)

  await sock.sendMessage(chatId, {
    text:
      `🌟 @${numero} ahora es *usuario premium* 🎉\n\n` +
      `📅 Vence: ${formatearVencimiento(resultado.vence)}`,
    mentions: [jid],
  })
}
