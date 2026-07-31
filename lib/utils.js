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
