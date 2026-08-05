import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const carpetaImagenes = path.join(__dirname, '..', 'assets', 'menu')

let ultimaUsada = null

export function obtenerImagenMenuAleatoria() {
  if (!fs.existsSync(carpetaImagenes)) return null

  const archivos = fs
    .readdirSync(carpetaImagenes)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))

  if (archivos.length === 0) return null

  let disponibles = archivos
  if (archivos.length > 1 && ultimaUsada) {
    disponibles = archivos.filter((f) => f !== ultimaUsada)
  }

  const elegida = disponibles[Math.floor(Math.random() * disponibles.length)]
  ultimaUsada = elegida

  return fs.readFileSync(path.join(carpetaImagenes, elegida))
}