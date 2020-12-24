const Scanner = require('./lib/scanner')
const { isWhitespace, isNewline, isParens } = require('./lib/type-checks')

/*
 * <message>       ::= <summary>, <newline>?, <body>
 *                  |  <summary>
 */
function message (commitText) {
  const scanner = new Scanner(commitText.trim())
  const start = scanner.position()
  const node = {
    type: 'message',
    children: []
  }
  // <summary>
  const s = summary(scanner)
  if (s instanceof Error) {
    throw s
  } else {
    node.children.push(s)
  }
  if (scanner.eof()) {
    node.position = { start, end: scanner.position() }
    return node
  }

  // <summary> <newline>* <body>
  if (isNewline(scanner.peek())) {
    while (isNewline(scanner.peek())) {
      scanner.next()
    }
  } else {
    throw invalidToken(scanner, ['none'])
  }
  node.children.push(body(scanner))
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <summary>      ::= <type> "(" <scope> ")" ["!"] ": " <text>
 *                 |  <type> ["!"] ": " <text>
 *
 */
function summary (scanner) {
  const start = scanner.position()
  const node = {
    type: 'summary',
    children: []
  }

  const t = type(scanner)
  if (t instanceof Error) {
    return t
  } else {
    node.children.push(t)
  }

  let s
  if (scanner.peek() === '(') {
    // <type> "(" <scope> ")" ...
    scanner.next()
    s = scope(scanner)
    if (s instanceof Error) {
      return s
    } else {
      node.children.push(s)
    }
    if (scanner.peek() !== ')') {
      return invalidToken(scanner, [')'])
    }
    scanner.next()
  }

  // ... ["!"] ...
  let b = breakingChange(scanner)
  if (b instanceof Error) {
    b = null
  } else {
    node.children.push(b)
  }

  // ... ": " <text>
  const sep = separator(scanner)
  if (sep instanceof Error) {
    return invalidToken(scanner, [!s && '(', !b && '!', ':'])
  } else {
    node.children.push(sep)
  }

  node.children.push(text(scanner))
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <type>         ::= 1*<any UTF8-octets except newline or parens or ["!"] ":" or whitespace>
 */
function type (scanner) {
  const start = scanner.position()
  const node = {
    type: 'type',
    value: ''
  }
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isParens(token) || isWhitespace(token) || isNewline(token) || token === '!' || token === ':') {
      break
    }
    node.value += scanner.next()
  }
  if (node.value === '') {
    return invalidToken(scanner, ['type'])
  } else {
    node.position = { start, end: scanner.position() }
    return node
  }
}

/*
 * <text>         ::= 1*<any UTF8-octets except newline>
 */
function text (scanner) {
  const start = scanner.position()
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
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <scope>        ::= 1*<any UTF8-octets except newline or parens>
 */
function scope (scanner) {
  const start = scanner.position()
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

  if (node.value === '') {
    return invalidToken(scanner, ['scope'])
  } else {
    node.position = { start, end: scanner.position() }
    return node
  }
}

/*
 * <body>          ::= <footer>+
 *                  | [<text>], <newline>, <body>*
 *                  | [<text>]
 */
function body (scanner) {
  const node = {
    type: 'body',
    children: []
  }
  const start = scanner.position()
  // 1*<footer>
  while (!scanner.eof()) {
    const f = footer(scanner)
    if (f instanceof Error) {
      scanner.rewind(start)
      node.children = []
      // [<text>], <newline>, <body>*
      const t = text(scanner)
      // [<text>]
      node.children.push(t)
      // <newline>, <body>*
      if (isNewline(scanner.peek())) {
        scanner.next()
        const b = body(scanner)
        if (b instanceof Error) {
          return b
        } else {
          Array.prototype.push.apply(node.children, b.children)
        }
      }
    } else {
      node.children.push(f)
    }
  }
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <footer>       ::= <token> <separator> *<whitespace> <value> <newline>?
*/
function footer (scanner) {
  const start = scanner.position()
  const node = {
    type: 'footer',
    children: []
  }
  // <token>
  const t = token(scanner)
  if (t instanceof Error) {
    return t
  } else {
    node.children.push(t)
  }

  // <separator> *<whitespace>
  const s = separator(scanner)
  if (s instanceof Error) {
    return s
  } else {
    node.children.push(s)
  }
  scanner.consumeWhitespace()

  // <value> <newline>?
  const v = value(scanner)
  if (v instanceof Error) {
    return v
  } else {
    node.children.push(v)
  }
  if (isNewline(scanner.peek())) {
    scanner.next()
  }
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <token>        ::= <breaking-change>
 *                 |  <type> "(" <scope> ")"
 *                 |  <type>
 */
function token (scanner) {
  const node = {
    type: 'token',
    children: []
  }

  // "BREAKING CHANGE"
  const start = scanner.position()
  const b = breakingChange(scanner)
  if (b instanceof Error) {
    scanner.rewind(start)
  } else {
    node.children.push(b)
    node.position = { start, end: scanner.position() }
    return node
  }

  // <type>
  const t = type(scanner)
  if (t instanceof Error) {
    return t
  } else {
    node.children.push(t)
    // <type> "(" <scope> ")"
    if (scanner.peek() === '(') {
      scanner.next()
      const s = scope(scanner)
      if (s instanceof Error) {
        return s
      } else {
        node.children.push(s)
      }
      if (scanner.peek() !== ')') return invalidToken(scanner, [')'])
      scanner.next()
    }
  }
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <breaking-change> ::= "!" | "BREAKING CHANGE"
 */
function breakingChange (scanner) {
  const start = scanner.position()
  const node = {
    type: 'breaking-change',
    value: ''
  }
  if (scanner.peek() === '!') {
    node.value = scanner.next()
  } else if (scanner.peekLiteral('BREAKING CHANGE')) {
    node.value = scanner.next('BREAKING CHANGE'.length)
  }
  if (node.value === '') {
    return invalidToken(scanner, ['BREAKING CHANGE'])
  } else {
    node.position = { start, end: scanner.position() }
    return node
  }
}

/*
 * <value>        ::= <text> 1*<continuation>
 *                 |  <text>
 */
function value (scanner) {
  const start = scanner.position()
  const node = {
    type: 'value',
    children: []
  }
  node.children.push(text(scanner))
  let c
  // 1*<continuation>
  while (!((c = continuation(scanner)) instanceof Error)) {
    node.children.push(c)
  }
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <newline> <whitespace> <text>
 */
function continuation (scanner) {
  const node = {
    type: 'continuation',
    children: []
  }
  const start = scanner.position()
  if (isNewline(scanner.peek())) {
    scanner.next()
    if (isWhitespace(scanner.peek())) {
      scanner.next()
      node.children.push(text(scanner))
    } else {
      scanner.rewind(start)
      return invalidToken(scanner, ['continuation'])
    }
  } else {
    return invalidToken(scanner, ['continuation'])
  }
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <separator>    ::= ": " | " #"
 */
function separator (scanner) {
  const start = scanner.position()
  const node = {
    type: 'separator',
    value: ''
  }

  // ': '
  if (scanner.peek() === ':') {
    scanner.next()
    if (scanner.peek() === ' ') {
      node.value = ': '
      scanner.next()
      node.position = { start, end: scanner.position() }
      return node
    } else {
      return invalidToken(scanner, ['separator'])
    }
  }

  // ' #'
  if (scanner.peek() === ' ') {
    scanner.next()
    if (scanner.peek() === '#') {
      scanner.next()
      node.value = ' #'
      node.position = { start, end: scanner.position() }
    } else {
      scanner.rewind(start)
      return invalidToken(scanner, ['separator'])
    }
  } else {
    return invalidToken(scanner, ['separator'])
  }
  return node
}

function invalidToken (scanner, expected) {
  const validTokens = expected.filter(Boolean).join(', ')
  if (scanner.eof()) {
    return Error(`unexpected token EOF valid tokens [${validTokens}]`)
  } else {
    const pos = scanner.position()
    return Error(`unexpected token '${scanner.peek()}' at position ${pos.line}:${pos.column} valid tokens [${validTokens}]`)
  }
}

module.exports = message
