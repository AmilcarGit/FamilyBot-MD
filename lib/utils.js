export function normalizarJid(jid = '') {
  if (!jid) return ''
  return jid
    .replace(/:\d+/, '')
    .replace('@s.whatsapp.net', '@s.whatsapp.net')
}

export function esOwner(jid, ownerList = []) {
  const jidNormalizado = normalizarJid(jid).split('@')[0]
  return ownerList.some((num) => num.replace(/\D/g, '') === jidNormalizado)
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function backoffDelay(intento, maxDelay) {
  const base = Math.min(1000 * 2 ** intento, maxDelay)
  return base
}

export function obtenerJidMencionado(msg, args = []) {
  const contexto = msg.message?.extendedTextMessage?.contextInfo
  if (contexto?.mentionedJid?.length) return contexto.mentionedJid[0]
  if (contexto?.participant) return contexto.participant

  const numero = args[0]?.replace(/\D/g, '')
  if (numero && numero.length >= 8) return `${numero}@s.whatsapp.net`

  return null
}

export function extraerIdYoutube(texto) {
  const patrones = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ]

  for (const patron of patrones) {
    const match = texto.match(patron)
    if (match) return match[1]
  }

  return null
}
