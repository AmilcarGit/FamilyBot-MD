import chalk from 'chalk'

const ANCHO = 46
const LINEA = '─'.repeat(ANCHO)

function filaConPuntos(etiqueta, valor) {
  const inicio = `  ${etiqueta} `
  const fin = ` ${valor}`
  const puntos = Math.max(2, ANCHO - inicio.length - fin.length)
  return chalk.magenta(inicio) + chalk.gray('.'.repeat(puntos)) + chalk.white(fin)
}

export function mostrarBannerInicio(nombreBot, version) {
  console.log('')
  console.log(chalk.magenta(`  🌸🦋 ${nombreBot.toUpperCase()} 🦋🌸`))
  console.log(chalk.gray(`  v${version}`))
  console.log(chalk.magenta(`  ${LINEA}`))
  console.log('')
}

export function mostrarResumenComandos(listaComandos) {
  const porCategoria = {}
  for (const c of listaComandos) {
    const cat = c.categoria || 'main'
    porCategoria[cat] = (porCategoria[cat] || 0) + 1
  }

  console.log(filaConPuntos('Comandos cargados', listaComandos.length))
  console.log('')

  for (const [cat, cantidad] of Object.entries(porCategoria).sort()) {
    console.log(filaConPuntos(`  ${cat}`, cantidad))
  }

  console.log(chalk.magenta(`  ${LINEA}`))
  console.log('')
}

export function mostrarConexionExitosa(nombreBot) {
  console.log(chalk.magenta(`  ${LINEA}`))
  console.log(chalk.greenBright(`  ✔ ${nombreBot} conectado correctamente`))
  console.log(chalk.gray(`  ${new Date().toLocaleString('es-PE')}`))
  console.log(chalk.magenta(`  ${LINEA}`))
  console.log('')
}
