import { iniciarSubbot, contarSubbotsDe, listarSubbots } from '../../subbots/manager.js'

export const desc = 'Vincula un número como subbot con todos los comandos del bot principal'
export const alias = ['subbot']
export const cooldown = 30

export default async function serbot({ sock, msg, args, chatId, config, esDueno }) {
  const jidRemitente = msg.key.participant || msg.key.remoteJid

  const numero = args[0]?.replace(/\D/g, '')
  if (!numero || numero.length < 8) {
    return sock.sendMessage(chatId, {
      text: '❀ Escribe el número que quieres vincular como subbot.\nEjemplo: serbot 51987654321',
    })
  }

  const activos = listarSubbots()
  const maxGlobal = config.maxSubbots ?? 5
  const maxPorUsuario = config.subbotsPorUsuario ?? 1

  if (activos.length >= maxGlobal && !esDueno) {
    return sock.sendMessage(chatId, {
      text: `❌ Se alcanzó el máximo de subbots activos (${maxGlobal}). Intenta más tarde.`,
    })
  }

  if (!esDueno && contarSubbotsDe(jidRemitente) >= maxPorUsuario) {
    return sock.sendMessage(chatId, {
      text: `❌ Ya tienes ${maxPorUsuario} subbot(s) activo(s). Usa *delsubbot* para liberar uno primero.`,
    })
  }

  await sock.sendMessage(chatId, { text: '⏳ Generando código de vinculación, espera un momento...' })

  const resultado = await iniciarSubbot({
    numero,
    creadorJid: jidRemitente,
    chatOrigen: chatId,
    sockPrincipal: sock,
  })

  if (!resultado.ok) {
    await sock.sendMessage(chatId, { text: resultado.mensaje })
  }
}
