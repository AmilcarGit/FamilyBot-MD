import { normalizarJid } from '../../lib/utils.js'

export const desc = 'Establece tu biografía de perfil'
export const cooldown = 3

const LIMITE_CARACTERES = 150

export default async function bio({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const texto = args.join(' ').trim()

  if (!texto) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe tu nueva biografía.\nEjemplo: bio Amante de los gatos 🐱',
    })
  }

  if (texto.length > LIMITE_CARACTERES) {
    return sock.sendMessage(chatId, {
      text: `❌ Máximo ${LIMITE_CARACTERES} caracteres. La tuya tiene ${texto.length}.`,
    })
  }

  const jidNormalizado = normalizarJid(jidRemitente)
  db.data.users[jidNormalizado] ??= { mensajes: 0 }
  db.data.users[jidNormalizado].bio = texto
  await db.write()

  await sock.sendMessage(chatId, { text: '✅ Tu biografía se actualizó.' })
}