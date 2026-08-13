import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const carpetaImagenes = path.join(__dirname, '..', 'assets', 'menu')

const MAX_HISTORIAL = 5
let historialUsadas = []

export function obtenerImagenMenuAleatoria() {
  if (!fs.existsSync(carpetaImagenes)) return null

  const archivos = fs
    .readdirSync(carpetaImagenes)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))

  if (archivos.length === 0) return null

  let disponibles = archivos.filter((f) => !historialUsadas.includes(f))

  if (disponibles.length === 0) {
    disponibles = archivos
    historialUsadas = []
  }

  const elegida = disponibles[Math.floor(Math.random() * disponibles.length)]

  historialUsadas.push(elegida)
  if (historialUsadas.length > Math.min(MAX_HISTORIAL, archivos.length - 1)) {
    historialUsadas.shift()
  }

  return fs.readFileSync(path.join(carpetaImagenes, elegida))
}