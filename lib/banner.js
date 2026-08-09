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
  if (c === 'grupo') return '👥'
  if (c === 'media') return '🎬'
  if (c === 'owner') return '👑'
  return '📂'
}

function filaConPuntos(etiqueta, valor) {
  const inicio = `  ${etiqueta} `
  const fin = ` ${valor}`
  const puntos = Math.max(2, ANCHO - anchoVisual(inicio) - anchoVisual(fin))
  return chalk.hex('#e94ec2')(inicio) + chalk.gray('.'.repeat(puntos)) + chalk.hex('#ff6ec7').bold(fin)
}

export function mostrarBannerInicio(nombreBot, version) {
  const titulo = `🌹 ${nombreBot.toUpperCase()} 🦋`
  const sub = `v${version} · by AmilcarGit`
  const borde = '═'.repeat(ANCHO)

  console.log('')
  console.log(chalk.hex('#ff4fa3')(`  ╔${borde}╗`))
  console.log(`  ║${centrar(textoGradiente(titulo), titulo, ANCHO)}║`)
  console.log(`  ║${centrar(chalk.dim(sub), sub, ANCHO)}║`)
  console.log(chalk.hex('#8b7cf6')(`  ╚${borde}╝`))
  console.log(chalk.gray(`   ${'░'.repeat(ANCHO)}`))
  console.log('')
}

export function mostrarResumenComandos(listaComandos) {
  const porCategoria = {}
  for (const c of listaComandos) {
    const cat = c.categoria || 'main'
    porCategoria[cat] = (porCategoria[cat] || 0) + 1
  }

  console.log(filaConPuntos('📚 Comandos cargados', listaComandos.length))
  console.log('')

  for (const [cat, cantidad] of Object.entries(porCategoria).sort()) {
    console.log(filaConPuntos(`  ${emojiCategoria(cat)} ${cat}`, cantidad))
  }

  console.log(chalk.hex('#c65fd9')(`  ${'─'.repeat(ANCHO)}`))
  console.log('')
}

export function mostrarConexionExitosa(nombreBot) {
  const linea1 = `✔ ${nombreBot} conectado correctamente`
  const linea2 = new Date().toLocaleString('es-PE')
  const borde = '═'.repeat(ANCHO)

  console.log(chalk.hex('#4ade80')(`  ╔${borde}╗`))
  console.log(`  ║${centrar(chalk.greenBright.bold(linea1), linea1, ANCHO)}║`)
  console.log(`  ║${centrar(chalk.gray(linea2), linea2, ANCHO)}║`)
  console.log(chalk.hex('#4ade80')(`  ╚${borde}╝`))
  console.log('')
}