export const PREGUNTAS_TRIVIA = [
  { pregunta: '¿Cuál es el planeta más grande del sistema solar?', respuesta: 'jupiter' },
  { pregunta: '¿En qué país se encuentra la Torre Eiffel?', respuesta: 'francia' },
  { pregunta: '¿Cuántos continentes hay en el mundo?', respuesta: '7' },
  { pregunta: '¿Cuál es el océano más grande del mundo?', respuesta: 'pacifico' },
  { pregunta: '¿Qué gas respiramos principalmente para vivir?', respuesta: 'oxigeno' },
  { pregunta: '¿Cuál es la capital de Perú?', respuesta: 'lima' },
  { pregunta: '¿Cuántos lados tiene un hexágono?', respuesta: '6' },
  { pregunta: '¿Qué animal es conocido como el rey de la selva?', respuesta: 'leon' },
  { pregunta: '¿En qué país se originó el karaoke?', respuesta: 'japon' },
  { pregunta: '¿Cuál es el único metal líquido a temperatura ambiente?', respuesta: 'mercurio' },
  { pregunta: '¿Cuántos huesos tiene el cuerpo humano adulto?', respuesta: '206' },
  { pregunta: '¿Cuál es el río más largo del mundo?', respuesta: 'amazonas' },
  { pregunta: '¿Qué instrumento se usa para medir la temperatura?', respuesta: 'termometro' },
  { pregunta: '¿Cuántas patas tiene una araña?', respuesta: '8' },
  { pregunta: '¿Cuál es la moneda oficial de Japón?', respuesta: 'yen' },
]

export const PALABRAS_AHORCADO = [
  'javascript', 'termux', 'whatsapp', 'programacion', 'computadora',
  'internet', 'servidor', 'mensaje', 'usuario', 'economia',
  'aventura', 'mariposa', 'universo', 'biblioteca', 'chocolate',
]

export function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const triviasActivas = new Map()
const ahorcadosActivos = new Map()

export function obtenerTriviaActiva(chatId) {
  return triviasActivas.get(chatId)
}

export function iniciarTrivia(chatId, datos) {
  triviasActivas.set(chatId, datos)
}

export function finalizarTrivia(chatId) {
  const datos = triviasActivas.get(chatId)
  if (datos?.timeoutId) clearTimeout(datos.timeoutId)
  triviasActivas.delete(chatId)
}

export function obtenerAhorcadoActivo(chatId) {
  return ahorcadosActivos.get(chatId)
}

export function iniciarAhorcado(chatId, datos) {
  ahorcadosActivos.set(chatId, datos)
}

export function finalizarAhorcado(chatId) {
  const datos = ahorcadosActivos.get(chatId)
  if (datos?.timeoutId) clearTimeout(datos.timeoutId)
  ahorcadosActivos.delete(chatId)
}

export function dibujarAhorcado(intentosRestantes) {
  const etapas = [
    '💀 Perdiste',
    '🪦\n😵',
    '🪦\n😰',
    '🪦\n😨',
    '🪦\n😟',
    '🪦\n🙂',
    '🪦\n😄',
  ]
  return etapas[Math.min(intentosRestantes, etapas.length - 1)]
}