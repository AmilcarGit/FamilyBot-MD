import { obtenerPerfilSocial } from '../../lib/social.js'

export const desc = 'Termina tu matrimonio actual'
export const alias = ['divorcio']
export const cooldown = 5

export default async function divorciarse({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  if (!perfil.pareja) {
    return sock.sendMessage(chatId, { text: '❌ No estás casado/a con nadie.' })
  }

  const jidPareja = perfil.pareja
  const perfilPareja = await obtenerPerfilSocial(db, jidPareja)

  perfil.pareja = null
  perfil.fechaMatrimonio = null
  perfilPareja.pareja = null
  perfilPareja.fechaMatrimonio = null
  await db.write()

  await sock.sendMessage(chatId, {
    text: `💔 @${jidRemitente.split('@')[0]} se divorció de @${jidPareja.split('@')[0]}.`,
    mentions: [jidRemitente, jidPareja],
  })
}