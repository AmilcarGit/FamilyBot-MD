import chalk from 'chalk'

const ANCHO = 42

const ARCOIRIS = ['#ff6ec7', '#ff9a56', '#ffd93d', '#6bcb77', '#4d96ff', '#a86ee8']

function anchoVisual(texto) {
  return [...texto].length
}

function textoGradiente(texto, negrita = true) {
  return [...texto]
    .map((c, i) => {
      const color = ARCOIRIS[i % ARCOIRIS.length]
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

function filaPuntos(etiqueta, valor, anchoInterior) {
  const inicio = ` ${etiqueta} `
  const fin = ` ${valor} `
  const puntos = Math.max(1, anchoInterior - anchoVisual(inicio) - anchoVisual(fin))
  const plano = inicio + '.'.repeat(puntos) + fin
  const color = chalk.hex('#ff6ec7')(inicio) + chalk.gray('.'.repeat(puntos)) + chalk.hex('#4d96ff').bold(fin)
  return { color, plano }
}

function dibujarCaja(lineasColor, lineasPlano, colorBorde) {
  const borde = '═'.repeat(ANCHO)
  const salida = []

  salida.push(chalk.hex(colorBorde)(`  ╔${borde}╗`))

  lineasColor.forEach((linea, i) => {
    const relleno = centrar(linea, lineasPlano[i], ANCHO)
    salida.push(`  ║${relleno}║${chalk.gray('▓')}`)
  })

  salida.push(chalk.hex(colorBorde)(`  ╚${borde}╝`) + chalk.gray('▓'))
  salida.push(chalk.gray(`   ${'▓'.repeat(ANCHO)}`))

  return salida.join('\n')
}

export function mostrarBannerInicio(nombreBot, version) {
  const titulo = `🌈 ${nombreBot.toUpperCase()} 🦋`
  const sub = `v${version} · by AmilcarGit`
  const flourish = '✨ 🦋 ✧ 🫧 ✧ 🦋 ✨'

  console.log('')
  console.log(
    dibujarCaja(
      [textoGradiente(titulo), chalk.dim(sub)],
      [titulo, sub],
      '#ff6ec7'
    )
  )
  console.log(centrar(textoGradiente(flourish, false), flourish, ANCHO + 2))
  console.log('')
}

export function mostrarResumenComandos(listaComandos) {
  const porCategoria = {}
  for (const c of listaComandos) {
    const cat = c.categoria || 'main'
    porCategoria[cat] = (porCategoria[cat] || 0) + 1
  }

  const filas = [filaPuntos('📚 Comandos cargados', listaComandos.length, ANCHO)]

  for (const [cat, cantidad] of Object.entries(porCategoria).sort()) {
    filas.push(filaPuntos(` ${emojiCategoria(cat)} ${cat}`, cantidad, ANCHO))
  }

  console.log(
    dibujarCaja(
      filas.map((f) => f.color),
      filas.map((f) => f.plano),
      '#a86ee8'
    )
  )
  console.log('')
}

export function mostrarConexionExitosa(nombreBot) {
  const linea1 = `✔ ${nombreBot} conectado correctamente`
  const linea2 = new Date().toLocaleString('es-PE')

  console.log(
    dibujarCaja(
      [chalk.greenBright.bold(linea1), chalk.dim(linea2)],
      [linea1, linea2],
      '#4ade80'
    )
  )
  console.log('')
}