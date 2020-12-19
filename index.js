const Scanner = require('./lib/scanner')
const { isWhitespace, isNewline, isParens } = require('./lib/type-checks')

/*
 * <message>      ::= <summary> <newline> <newline> 1*<footer>
 *                 |  <summary> <newline> <newline> <body> <newline> <newline> 1*<footer>
 *                 |  <summary> <newline> <newline> <body>
 *                 |  <summary>
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
    node.children.push(text(scanner))
  } else if (scanner.peek() === '(') {
    // <type> "(" <scope> ")" ":" *<whitespace> <text>
    scanner.next()
    node.children.push(scope(scanner))
    if (scanner.peek() !== ')'); // TODO(bcoe): handle parsing errors.
    scanner.next()
    if (scanner.peek() !== ':'); // TODO(bcoe): handle parsing errors.
    scanner.next()
    node.children.push(text(scanner))
  }
  return node
}

/*
 * <type>         ::= 1*<any UTF8-octets except newline or parens or ":" or whitespace>
 */
function type (scanner) {
  scanner.consumeWhitespace()
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
  scanner.consumeWhitespace()
  return node
}

/*
 * <text>         ::= 1*<any UTF8-octets except newline>
 */
function text (scanner) {
  scanner.consumeWhitespace()
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
  scanner.consumeWhitespace()
  return node
}

/*
 * <scope>        ::= 1*<any UTF8-octets except newline or parens>
 */
function scope (scanner) {
  scanner.consumeWhitespace()
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
  scanner.consumeWhitespace()
  return node
}

module.exports = message
