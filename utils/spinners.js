const logUpdate = require('log-update')
const kleur = require('kleur')

class Spinner {
  constructor (text, { frames = ['-', '\\', '|', '/'] } = {}) {
    this.text = text
    this.running = true
    this.frames = frames
    this.logged = null
    this.color = 'white'
    this.update(0)
  }

  get output () {
    const body = kleur[this.color](`${this.frame} ${this.text}`)
    const tail = this.logged ? this.logged : ''
    return body + tail
  }

  start () { this.running = true }
  stop () { this.running = false }

  update (frameCount) {
    if (!this.running) return
    this.frame = kleur.gray(this.frames[frameCount % this.frames.length])
  }

  log (text) {
    this.logged = ` → ${kleur.gray(text)}`
  }

  success (message) {
    this.frame = '✔'
    this.color = 'green'
    if (message) this.log(message)
    this.stop()
  }

  warning (message) {
    this.frame = '⚠'
    this.color = 'yellow'
    if (message) this.log(message)
    this.stop()
  }

  error (message) {
    this.frame = '✖'
    this.color = 'red'
    if (message) this.log(message)
    this.stop()
  }
}

module.exports = ({
  frames = ['-', '\\', '|', '/'],
  interval = 80
} = {}) => {
  let frameCount = 0
  const SPINNERS = {}

  const raf = setInterval(update, interval)

  const api = {
    add: key => {
      SPINNERS[key] = new Spinner(key, { frames })
      return SPINNERS[key]
    },

    done: () => {
      clearInterval(raf)
      update()
      logUpdate.stderr.done()
    }
  }

  return api

  function update () {
    const spinners = Object.values(SPINNERS)
    if (!spinners.length) return

    frameCount++
    spinners.forEach(spinner => spinner.update(frameCount))
    logUpdate.stderr(spinners.map(spinner => spinner.output).join('\n'))
  }
}
