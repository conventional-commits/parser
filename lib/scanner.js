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
    const token = n
      ? this.text.substring(this.pos.offset, this.pos.offset + n)
      : this.peek()

    this.pos.offset += token.length
    this.pos.column += token.length

    if (isNewline(token)) {
      this.pos.line++
      this.pos.column = 1
    }

    return token
  }

  consumeWhitespace () {
    while (isWhitespace(this.peek())) {
      this.next()
    }
  }

  peek () {
    let token = this.text.charAt(this.pos.offset)
    // Consume <CR>? <LF>
    if (token === CR && this.text.charAt(this.pos.offset + 1) === LF) {
      token += LF
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
