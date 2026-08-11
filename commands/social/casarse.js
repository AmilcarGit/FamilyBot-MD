import { normalizarJid, obtenerJidMencionado } from '../../lib/utils.js'
import { obtenerPerfilSocial } from '../../lib/social.js'

export const desc = 'Propón matrimonio a otro usuario (ambos deben usar el comando)'
export const alias = ['matrimonio', 'casar']
export const cooldown = 5

const DURACION_PROPUESTA_MS = 10 * 60 * 1000

export default async function casarse({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidObjetivo = obtenerJidMencionado(msg, args)

  if (!jidObjetivo) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona, responde o escribe el número de la persona con quien quieres casarte.',
    })
  }

  if (normalizarJid(jidObjetivo) === normalizarJid(jidRemitente)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes casarte contigo mismo.' })
  }

  const perfilPropio = await obtenerPerfilSocial(db, jidRemitente)
  if (perfilPropio.pareja) {
    return sock.sendMessage(chatId, { text: '❌ Ya estás casado/a. Usa *divorciarse* primero.' })
  }

  const perfilObjetivo = await obtenerPerfilSocial(db, jidObjetivo)
  if (perfilObjetivo.pareja) {
    return sock.sendMessage(chatId, {
      text: '❌ Esa persona ya está casada con alguien más.',
    })
  }

  db.data.propuestasMatrimonio ??= {}

  const jidPropioNorm = normalizarJid(jidRemitente)
  const jidObjetivoNorm = normalizarJid(jidObjetivo)

  const propuestaExistente = db.data.propuestasMatrimonio[jidPropioNorm]
  const ahora = Date.now()

  if (
    propuestaExistente &&
    propuestaExistente.de === jidObjetivoNorm &&
    propuestaExistente.expira > ahora
  ) {
    perfilPropio.pareja = jidObjetivoNorm
    perfilPropio.fechaMatrimonio = ahora
    perfilObjetivo.pareja = jidPropioNorm
    perfilObjetivo.fechaMatrimonio = ahora

    delete db.data.propuestasMatrimonio[jidPropioNorm]
    await db.write()

    return sock.sendMessage(chatId, {
      text: `💍 ¡@${jidRemitente.split('@')[0]} y @${jidObjetivo.split('@')[0]} se casaron! 🎉💕`,
      mentions: [jidRemitente, jidObjetivo],
    })
  }

  db.data.propuestasMatrimonio[jidObjetivoNorm] = {
    de: jidPropioNorm,
    expira: ahora + DURACION_PROPUESTA_MS,
  }
  await db.write()

  await sock.sendMessage(chatId, {
    text:
      `💍 @${jidRemitente.split('@')[0]} le propuso matrimonio a @${jidObjetivo.split('@')[0]}.\n\n` +
      `Si @${jidObjetivo.split('@')[0]} también usa *casarse @${jidRemitente.split('@')[0]}* dentro de 10 minutos, quedan casados.`,
    mentions: [jidRemitente, jidObjetivo],
  })
}