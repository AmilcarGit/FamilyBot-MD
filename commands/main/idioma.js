import { normalizarJid } from '../../lib/utils.js'
import { idiomasDisponibles, t as traducir } from '../../lib/i18n.js'

export const desc = 'Cambia el idioma del bot para ti'
export const alias = ['language', 'lang']
export const cooldown = 3

export default async function idioma({ sock, msg, args, chatId, db, config, t }) {
  const disponibles = idiomasDisponibles()
  const opcion = args[0]?.toLowerCase()

  if (!opcion) {
    const jidRemitente = msg.key.participant || msg.key.remoteJid
    const jidNormalizado = normalizarJid(jidRemitente)
    const idiomaActual = db.data.users[jidNormalizado]?.idioma || config.idiomaPorDefecto

    return sock.sendMessage(chatId, {
      text: t('idiomaActual', { idioma: idiomaActual, prefijo: config.prefijo }),
    })
  }

  if (!disponibles.includes(opcion)) {
    return sock.sendMessage(chatId, {
      text: t('idiomaInvalido', { opciones: disponibles.join(', ') }),
    })
  }

  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidNormalizado = normalizarJid(jidRemitente)
  db.data.users[jidNormalizado] ??= { mensajes: 0 }
  db.data.users[jidNormalizado].idioma = opcion
  await db.write()

  await sock.sendMessage(chatId, { text: traducir(opcion, 'idiomaCambiado') })
}