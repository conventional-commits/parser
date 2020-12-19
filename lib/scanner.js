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

  next (n) {
    if (n) {
      const token = this.text.substring(this.pos, this.pos + n)
      this.pos += n
      return token
    } else {
      const token = this.peek()
      this.pos += token.length
      return token
    }
  }

  nextIgnoreWhitespace () {
    this.consumeWhitespace()
    this.next()
    this.consumeWhitespace()
  }

  consumeWhitespace () {
    while (isWhitespace(this.peek())) {
      this.pos++
    }
  }

  peek () {
    let token = this.text.charAt(this.pos)
    // Consume <CR>? <LF>
    if (token === CR && this.text.charAt(this.pos + 1) === LF) {
      token += LF
    // Consume ?: separator
    } else if (token === '!' && this.text.charAt(this.pos + 1) === ':') {
      token += ':'
    }
    return token
  }

  peekLiteral (literal) {
    const str = this.text.substring(this.pos, this.pos + literal.length)
    return literal === str
  }

  position () {
    return this.pos
  }

  rewind (pos) {
    this.pos = pos
  }
}

module.exports = Scanner
