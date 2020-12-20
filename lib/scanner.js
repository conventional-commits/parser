const { isWhitespace, isNewline } = require('./type-checks')
const { CR, LF } = require('./codes')

class Scanner {
  constructor (text, pos) {
    this.text = text
    this.pos = pos ? { ...pos } : { line: 1, column: 1, offset: 0 }
  }

  eof () {
    return this.pos.offset >= this.text.length
  }

  next (n) {
    if (n) {
      const token = this.text.substring(this.pos.offset, this.pos.offset + n)
      this.pos.offset += n
      this.pos.column += n
      return token
    } else {
      const token = this.peek()
      this.pos.offset += token.length
      this.pos.column += token.length
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
      if (isNewline(this.peek())) {
        this.pos.line++
        this.pos.column = 1
      }
      this.pos.offset++
    }
  }

  peek () {
    let token = this.text.charAt(this.pos.offset)
    // Consume <CR>? <LF>
    if (token === CR && this.text.charAt(this.pos.offset + 1) === LF) {
      token += LF
    // Consume ?: separator
    } else if (token === '!' && this.text.charAt(this.pos.offset + 1) === ':') {
      token += ':'
    }
    return token
  }

  peekLiteral (literal) {
    const str = this.text.substring(this.pos.offset, this.pos.offset + literal.length)
    return literal === str
  }

  position () {
    return { ...this.pos }
  }

  rewind (pos) {
    this.pos = pos
  }
}

module.exports = Scanner
