import chalk from 'chalk'

const ANCHO = 42

const GRADIENTE_ROSA = ['#ff6ec7', '#ff4fa3', '#e94ec2', '#c65fd9', '#a86ee8', '#8b7cf6']

function anchoVisual(texto) {
  return [...texto].length
}

function textoGradiente(texto, negrita = true) {
  return [...texto]
    .map((c, i) => {
      const color = GRADIENTE_ROSA[i % GRADIENTE_ROSA.length]
      const estilo = chalk.hex(color)
      return negrita ? estilo.bold(c) : estilo(c)
    })
    .join('')
}

function centrar(textoColor, textoPlano, ancho) {
  const espacio = Math.max(0, ancho - anchoVisual(textoPlano))
  const izq = Math.floor(espacio / 2)
  const der = espacio - izq
  return ' '.repeat(izq) + textoColor + ' '.repeat(der)
}

function emojiCategoria(cat) {
  const c = cat.toLowerCase()
  if (c === 'main') return '🏠'
  if (c === 'descargas') return '📥'
  if (c === 'economia') return '💰'
  i