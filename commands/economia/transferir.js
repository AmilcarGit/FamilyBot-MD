import { normalizarJid, obtenerJidMencionado, resolverNumeroReal } from '../../lib/utils.js'
import { obtenerUsuario } from '../../lib/economia.js'

export const desc = 'Transfiere efectivo a otro usuario'
export const cooldown = 3

export default async function transferir({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidObjetivo = obtenerJidMencionado(msg, args)

  if (!jidObjetivo) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número a quién quieres transferir.',
    })
  }

  if (normalizarJid(jidObjetivo) === normalizarJid(jidRemitente)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes transferirte a ti mismo.' })
  }

  const montoTexto = args.find((a) => /^\d+$/.test(a))
  const monto = parseInt(montoTexto, 10)

  const ecoOrigen = await obtenerUsuario(db, jidRemitente)

  if (!monto || monto <= 0 || monto > ecoOrigen.saldo) {
    return sock.sendMessage(chatId, {
      text: `❌ Escribe un monto válido para transferir (tienes ${ecoOrigen.saldo} en efectivo).`,
    })
  }

  const ecoDestino = await obtenerUsuario(db, jidObjetivo)

  ecoOrigen.saldo -= monto
  ecoDestino.saldo += monto
  await db.write()

  const numeroObjetivo = await resolverNumeroReal(sock, jidObjetivo)
  await sock.sendMessage(chatId, {
    text: `✅ Transferiste ${monto} a @${numeroObjetivo}.`,
    mentions: [jidObjetivo],
  })
}