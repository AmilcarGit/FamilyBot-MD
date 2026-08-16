import { normalizarJid, obtenerJidMencionado, resolverNumeroReal } from '../../lib/utils.js'

export const desc = 'Calcula el porcentaje de compatibilidad entre dos personas'
export const cooldown = 3

function hashPorcentaje(texto) {
  let hash = 0
  for (let i = 0; i < texto.length; i++) {
    hash = (hash << 5) - hash + texto.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 101
}

function fraseSegunPorcentaje(p) {
  if (p >= 90) return '💘 ¡Almas gemelas!'
  if (p >= 70) return '💕 Muy buena combinación'
  if (p >= 50) return '💛 Podría funcionar'
  if (p >= 30) return '💔 Mejor quedan como amigos'
  return '☠️ Ni lo intenten'
}

function barraCorazones(p) {
  const llenos = Math.round((p / 100) * 10)
  return '❤️'.repeat(llenos) + '🤍'.repeat(10 - llenos)
}

export default async function ship({ sock, msg, args, chatId }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

  let jidA = jidRemitente
  let jidB = mencionados[0]

  if (mencionados.length >= 2) {
    jidA = mencionados[0]
    jidB = mencionados[1]
  } else if (!jidB) {
    jidB = obtenerJidMencionado(msg, args)
  }

  if (!jidB) {
    return sock.sendMessage(chatId, {
      text: '❀ Menciona a una o dos personas.\nEjemplo: ship @persona1 @persona2',
    })
  }

  if (normalizarJid(jidA) === normalizarJid(jidB)) {
    return sock.sendMessage(chatId, { text: '❌ No puedes shippearte contigo mismo 😅' })
  }

  const claveHash = [normalizarJid(jidA), normalizarJid(jidB)].sort().join('-')
  const porcentaje = hashPorcentaje(claveHash)
  const numeroA = await resolverNumeroReal(sock, jidA, msg)
  const numeroB = await resolverNumeroReal(sock, jidB)

  await sock.sendMessage(chatId, {
    text:
      `💘 *Ship*\n\n` +
      `@${numeroA} 💞 @${numeroB}\n\n` +
      `${barraCorazones(porcentaje)}\n` +
      `${porcentaje}% de compatibilidad\n\n` +
      `${fraseSegunPorcentaje(porcentaje)}`,
    mentions: [jidA, jidB],
  })
}