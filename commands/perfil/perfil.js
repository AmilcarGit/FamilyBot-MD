import { normalizarJid, obtenerJidMencionado } from '../../lib/utils.js'
import { calcularNivel, mensajesParaNivel, barraProgresoNivel } from '../../lib/perfil.js'

export const desc = 'Muestra tu perfil o el de otro usuario'
export const alias = ['profile', 'yo']
export const cooldown = 3

export default async function perfil({ sock, msg, args, chatId, db }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid
  const jidObjetivo = obtenerJidMencionado(msg, args) || jidRemitente
  const jidNormalizado = normalizarJid(jidObjetivo)

  const usuario = db.data.users[jidNormalizado]

  if (!usuario) {
    return sock.sendMessage(chatId, { text: '❌ Esa persona no tiene datos guardados todavía.' })
  }

  const mensajes = usuario.mensajes || 0
  const nivel = calcularNivel(mensajes)
  const siguiente = mensajesParaNivel(nivel + 1)
  const barra = barraProgresoNivel(mensajes)

  let texto = `👤 *Perfil de @${jidObjetivo.split('@')[0]}*\n\n`

  if (usuario.registrado) {
    texto += `📛 Nombre: ${usuario.nombre}\n🎂 Edad: ${usuario.edad}\n`
  }

  texto += `⭐ Nivel: ${nivel}\n${barra}\n💬 Mensajes: ${mensajes} (faltan ${Math.max(0, siguiente - mensajes)} para nivel ${nivel + 1})\n`

  if (usuario.bio) {
    texto += `📝 Bio: ${usuario.bio}\n`
  }

  if (usuario.social?.pareja) {
    texto += `💑 Pareja: @${usuario.social.pareja.split('@')[0]}\n`
  }

  const mentions = [jidObjetivo]
  if (usuario.social?.pareja) mentions.push(usuario.social.pareja)

  try {
    const ppUrl = await sock.profilePictureUrl(jidObjetivo, 'image')
    await sock.sendMessage(chatId, {
      image: { url: ppUrl },
      caption: texto,
      mentions,
    })
  } catch {
    await sock.sendMessage(chatId, { text: texto, mentions })
  }
}