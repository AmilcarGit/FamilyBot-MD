export function calcularNivel(mensajes) {
  return Math.floor(Math.sqrt(mensajes / 50)) + 1
}

export function mensajesParaNivel(nivel) {
  return Math.pow(nivel - 1, 2) * 50
}

export function barraProgresoNivel(mensajes) {
  const nivelActual = calcularNivel(mensajes)
  const mensajesNivelActual = mensajesParaNivel(nivelActual)
  const mensajesSiguienteNivel = mensajesParaNivel(nivelActual + 1)

  const progreso =
    mensajesSiguienteNivel > mensajesNivelActual
      ? (mensajes - mensajesNivelActual) / (mensajesSiguienteNivel - mensajesNivelActual)
      : 1

  const llenos = Math.round(Math.max(0, Math.min(1, progreso)) * 10)
  return '🟦'.repeat(llenos) + '⬜'.repeat(10 - llenos)
}