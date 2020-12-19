
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
    if (token === '\r' && this.text.charAt(this.pos + 1) === '\n') {
      token += '\n'
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

function isParens (token) {
  return token === '(' || token === ')'
}

/*
 * <ZWNBSP>       ::= "U+FEFF"
 * <TAB>          ::= "U+0009"
 * <VT>           ::= "U+000B"
 * <FF>           ::= "U+000C"
 * <SP>           ::= "U+0020"
 * <NBSP>         ::= "U+00A0"
*/
function isWhitespace (token) {
  return token === '\ufeff' || token === '\u0009' || token === '\u000b' || token === '\u000c' || token === '\u0020' || token === '\u00a0'
}

function isNewline (token) {
  const chr = token.charAt(0)
  if (chr === '\r' || chr === '\n') return true
}

/*
 * <message>      ::= <summary> <newline> <newline> 1*<footer>
 *                 |  <summary> <newline> <newline> <body> <newline> <newline> 1*<footer>
 *                 |  <summary> <newline> <newline> <body>
 *                 |  <summary></summary>
 */
function message (commitText) {
  const scanner = new Scanner(commitText)
  const node = {
    type: 'message',
    children: []
  }
  node.children.push(summary(scanner))
  return node
}

/*
 * <summary>      ::= <type> "(" <scope> ")" ":" *<whitespace> <text>
 *                 |  <type> ":" *<whitespace> <text>
 */
function summary (scanner) {
  const node = {
    type: 'summary',
    children: []
  }
  node.children.push(type(scanner))
  if (scanner.peek() === ':') {
    // <type> ":" *<whitespace> <text>
    scanner.next()
    scanner.consumeWhitespace()
    node.children.push(text(scanner))
  } else if (scanner.peek() === '(') {
    // <type> "(" <scope> ")" ":" *<whitespace> <text>
    scanner.next()
    node.children.push(scope(scanner))
    if (scanner.peek() !== ')'); // TODO(bcoe): handle parsing errors.
    scanner.next()
    if (scanner.peek() !== ':'); // TODO(bcoe): handle parsing errors.
    scanner.next()
    scanner.consumeWhitespace()
    node.children.push(text(scanner))
  }
  return node
}

/*
 * <type>         ::= 1*<any UTF8-octets except newline or parens or ":" or whitespace>
 */
function type (scanner) {
  const node = {
    type: 'type',
    value: ''
  }
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isParens(token) || isWhitespace(token) || isNewline(token) || token === ':') {
      break
    }
    node.value += scanner.next()
  }
  return node
}

/*
 * <text>         ::= 1*<any UTF8-octets except newline>
 */
function text (scanner) {
  const node = {
    type: 'text',
    value: ''
  }
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isNewline(token)) {
      break
    }
    node.value += scanner.next()
  }
  return node
}

/*
 * <scope>        ::= 1*<any UTF8-octets except newline or parens>
 */
function scope (scanner) {
  const node = {
    type: 'scope',
    value: ''
  }
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isParens(token) || isNewline(token)) {
      break
    }
    node.value += scanner.next()
  }
  return node
}

module.exports = message
