import { obtenerPerfilSocial, formatearDuracion } from '../../lib/social.js'

export const desc = 'Muestra tu pareja y mascota juntos'
export const cooldown = 3

export default async function familia({ sock, msg, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const perfil = await obtenerPerfilSocial(db, jidRemitente)

  let texto = '👨‍👩‍👧 *Tu familia*\n\n'

  if (perfil.pareja) {
    const duracion = formatearDuracion(Date.now() - perfil.fechaMatrimonio)
    texto += `💑 Pareja: @${perfil.pareja.split('@')[0]} (${duracion} juntos)\n`
  } else {
    texto += `💔 Sin pareja\n`
  }

  if (perfil.mascota) {
    texto += `${perfil.mascota.emoji} Mascota: ${perfil.mascota.nombreMascota} (nivel ${perfil.mascota.nivel})`
  } else {
    texto += `🐾 Sin mascota`
  }

  await sock.sendMessage(chatId, {
    text: texto,
    mentions: perfil.pareja ? [perfil.pareja] : [],
  })
}