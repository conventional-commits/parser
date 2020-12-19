const { isWhitespace } = require('./type-checks')
const { CR, LF } = require('./codes')

class Scanner {
  constructor (text) {
    this.pos = 0
    this.text = text
  }

  eof () {
    return this.pos >= this.text.length
  }

  next () {
    const token = this.peek()
    this.pos += token.length
    return token
  }

  peek () {
    let token = this.text.charAt(this.pos)
    // Consume <CR>? <LF>
    if (token === CR && this.text.charAt(this.pos + 1) === LF) {
      token += LF
    }
    return token
  }

  position () {
    return this.pos
  }

  rewind (pos) {
    this.pos = pos
  }

  consumeWhitespace () {
    while (isWhitespace(this.peek())) {
      this.pos++
    }
  }
}

module.exports = Scanner
