import { obtenerPerfilSocial, formatearDuracion } from '../../lib/social.js'

export const desc = 'Muestra tu pareja actual'
export const cooldown = 3

export default async function pareja({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  if (!perfil.pareja) {
    return sock.sendMessage(chatId, {
      text: '💔 No tienes pareja. Usa *casarse @usuario* para proponer matrimonio.',
    })
  }

  const duracion = formatearDuracion(Date.now() - perfil.fechaMatrimonio)

  await sock.sendMessage(chatId, {
    text: `💑 Estás casado/a con @${perfil.pareja.split('@')[0]}\n⏳ Llevan juntos: ${duracion}`,
    mentions: [perfil.pareja],
  })
}