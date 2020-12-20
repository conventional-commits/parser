const Scanner = require('./lib/scanner')
const { isWhitespace, isNewline, isParens, isSummarySep } = require('./lib/type-checks')

/*
 * <message>      ::= <summary> <newline> <body-footer>
 *                 |  <summary>
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

  // <summary> <newline> <body-footer>
  if (isNewline(scanner.peek())) {
    scanner.next()
  } else {
    invalidToken(scanner, ['none'])
  }
  node.children.push(bodyFooter(scanner))
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <summary>      ::= <type> "(" <scope> ")" <summary-sep> <text>
 *                 |  <type> <summary-sep> <text>
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

  if (scanner.peek() === ':' || isSummarySep(scanner.peek())) {
    // <type> <summary-sep> <text>
    node.children.push(summarySep(scanner))
    node.children.push(text(scanner))
  } else if (scanner.peek() === '(') {
    // <type> "(" <scope> ")" <summary-sep> <text>
    scanner.next()
    const s = scope(scanner)
    if (s instanceof Error) {
      return s
    } else {
      node.children.push(s)
    }
    if (scanner.peek() !== ')') return invalidToken(scanner, [')'])
    scanner.next()
    const sep = summarySep(scanner)
    if (sep instanceof Error) {
      return sep
    } else {
      node.children.push(sep)
    }
    node.children.push(text(scanner))
  } else {
    return invalidToken(scanner, [':', '('])
  }
  node.position = { start, end: scanner.position() }
  return node
}

/*
 * <type>         ::= 1*<any UTF8-octets except newline or parens or ":" or "!:" or whitespace>
 */
function type (scanner) {
  const start = scanner.position()
  const node = {
    type: 'type',
    value: ''
  }
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isParens(token) || isWhitespace(token) || isNewline(token) || isSummarySep(token) || token === ':') {
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
 * <summary-sep>  ::= "!"? ":" *<whitespace>
 */
function summarySep (scanner) {
  const start = scanner.position()
  const node = {
    type: 'summary-sep',
    children: []
  }
  if (isSummarySep(scanner.peek())) {
    scanner.next()
    // manually offset the end with half the "!:" size
    const breakingEnd = scanner.position()
    breakingEnd.offset--;
    breakingEnd.column--;
    node.children.push({
      type: 'breaking-change',
      value: '!',
      position: { start, end: breakingEnd }
    })
    // manually offset the start with half the "!:" size
    const separatorStart = scanner.position()
    separatorStart.offset--;
    separatorStart.column--;
    node.children.push({
      type: 'separator',
      value: ':',
      position: { start: separatorStart, end: scanner.position() }
    })
  } else if (scanner.peek() === ':') {
    scanner.next()
    node.children.push({
      type: 'separator',
      value: ':',
      position: { start, end: scanner.position() }
    })
  } else {
    return invalidToken(scanner, [':'])
  }
  scanner.consumeWhitespace()
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
 * <body-footer>  ::= 1*<footer>
 *                ::= <body> <newline> 1*<body-footer>
 *                ::= <body>
 */
function bodyFooter (scanner) {
  const node = {
    type: 'body-footer',
    children: []
  }
  const start = scanner.position()
  // 1*<footer>
  while (!scanner.eof()) {
    const f = footer(scanner)
    if (f instanceof Error) {
      node.children = []
      scanner.rewind(start)
      break
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
 * <token>        ::= "BREAKING CHANGE"
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
  const b = breakingChangeLiteral(scanner)
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
 * "BREAKING CHANGE"
 */
function breakingChangeLiteral (scanner) {
  const start = scanner.position()
  const node = {
    type: 'breaking-change',
    value: ''
  }
  if (scanner.peekLiteral('BREAKING CHANGE')) {
    const literal = scanner.next('BREAKING CHANGE'.length)
    node.value = literal
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
 * <separator>    ::= <summary-sep> | ' #'
 */
function separator (scanner) {
  const node = {
    type: 'separator',
    value: ''
  }
  // <summary-sep>
  const start = scanner.position()
  const sum = summarySep(scanner)
  if (sum instanceof Error) {
    scanner.rewind(start)
  } else {
    return sum
  }

  // ' #'
  if (scanner.peek() === ' ') {
    scanner.next()
    if (scanner.peek() === '#') {
      scanner.next()
      node.value = ' #'
    } else {
      return invalidToken(scanner, ['separator'])
    }
  } else {
    return invalidToken(scanner, ['separator'])
  }
  node.position = { start, end: scanner.position() }
  return node
}

function invalidToken (scanner, expected) {
  if (scanner.eof()) {
    return Error(`unexpected token EOF valid tokens [${expected.join(', ')}]`)
  } else {
    const pos = scanner.position()
    const posString = `{ line: ${pos.line}, column: ${pos.column}, offset: ${pos.offset} }`
    return Error(`unexpected token '${scanner.peek()}' at position ${posString} valid tokens [${expected.join(', ')}]`)
  }
}

module.exports = message
