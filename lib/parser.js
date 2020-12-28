const Scanner = require('./scanner')
const { isWhitespace, isNewline, isParens } = require('./type-checks')

/*
 * <message>       ::= <summary>, <newline>*, <body>, <newline>*, <footer>+
 *                  |  <summary>, <newline>*, <footer>+
 *                  |  <summary>, <newline>*
 *
 */
function message (commitText) {
  const scanner = new Scanner(commitText.trim())
  const node = scanner.enter('message', [])

  // <summary>
  const s = summary(scanner)
  if (s instanceof Error) {
    throw s
  } else {
    node.children.push(s)
  }
  if (scanner.eof()) {
    return scanner.exit(node)
  }

  // <summary> <newline>* <body>
  if (isNewline(scanner.peek())) {
    // TODO(@byCedric): include <newline>* in AST.
    while (isNewline(scanner.peek())) {
      scanner.next()
    }
  } else {
    throw scanner.abort(node)
  }
  const b = body(scanner)
  if (!(b instanceof Error)) {
    node.children.push(b)
  }
  // TODO(@byCedric): include <newline>* in AST.
  while (isNewline(scanner.peek())) {
    scanner.next()
  }
  while (!scanner.eof()) {
    const f = footer(scanner)
    if (!(f instanceof Error)) node.children.push(f)
  }
  return scanner.exit(node)
}

/*
 * <summary>      ::= <type> "(" <scope> ")" ["!"] ":" <whitespace>* <text>
 *                 |  <type> ["!"] ":" <whitespace>* <text>
 *
 */
function summary (scanner) {
  const node = scanner.enter('summary', [])

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
      return scanner.abort(node, [')'])
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

  // ... ":" ...
  const sep = separator(scanner)
  if (sep instanceof Error) {
    return scanner.abort(node, [!s && '(', !b && '!', ':'])
  } else {
    node.children.push(sep)
  }

  // ... <whitespace>* ...
  const ws = whitespace(scanner)
  if (!(ws instanceof Error)) {
    node.children.push(ws)
  }

  // ... <text>
  node.children.push(text(scanner))
  return scanner.exit(node)
}

/*
 * <type>         ::= 1*<any UTF8-octets except newline or parens or ["!"] ":" or whitespace>
 */
function type (scanner) {
  const node = scanner.enter('type', '')
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isParens(token) || isWhitespace(token) || isNewline(token) || token === '!' || token === ':') {
      break
    }
    node.value += scanner.next()
  }
  if (node.value === '') {
    return scanner.abort(node)
  } else {
    return scanner.exit(node)
  }
}

/*
 * <text>         ::= 1*<any UTF8-octets except newline>
 */
function text (scanner) {
  const node = scanner.enter('text', '')
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isNewline(token)) {
      break
    }
    node.value += scanner.next()
  }
  return scanner.exit(node)
}

/*
 * <scope>        ::= 1*<any UTF8-octets except newline or parens>
 */
function scope (scanner) {
  const node = scanner.enter('scope', '')
  while (!scanner.eof()) {
    const token = scanner.peek()
    if (isParens(token) || isNewline(token)) {
      break
    }
    node.value += scanner.next()
  }

  if (node.value === '') {
    return scanner.abort(node)
  } else {
    return scanner.exit(node)
  }
}

/*
 * <body>          ::= [<any text except pre-footer>], <newline>, <body>*
 *                  | [<any text except pre-footer>]
 */
function body (scanner) {
  const node = scanner.enter('body', [])
  // <any text except pre-footer>
  const pf = preFooter(scanner)
  if (!(pf instanceof Error)) return scanner.abort(node)

  // [<text>]
  const t = text(scanner)
  node.children.push(t)
  // <newline>, <body>*
  if (isNewline(scanner.peek())) {
    scanner.next()
    const b = body(scanner)
    if (!(b instanceof Error)) {
      Array.prototype.push.apply(node.children, b.children)
    }
  }
  return scanner.exit(node)
}

/*
 * <newline>*, <footer>+
 */
function preFooter (scanner) {
  const node = scanner.enter('pre-footer', [])
  while (isNewline(scanner.peek())) {
    scanner.next()
  }
  let f
  while (!scanner.eof()) {
    f = footer(scanner)
    if (f instanceof Error) return scanner.abort(node)
  }
  return scanner.exit(node)
}

/*
 * <footer>       ::= <token> <separator> <whitespace>* <value> <newline>?
 */
function footer (scanner) {
  const node = scanner.enter('footer', [])
  // <token>
  const t = token(scanner)
  if (t instanceof Error) {
    return t
  } else {
    node.children.push(t)
  }

  // <separator>
  const s = separator(scanner)
  if (s instanceof Error) {
    return s
  } else {
    node.children.push(s)
  }

  // <whitespace>*
  const ws = whitespace(scanner)
  if (!(ws instanceof Error)) {
    node.children.push(ws)
  }

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
  return scanner.exit(node)
}

/*
 * <token>        ::= <breaking-change>
 *                 |  <type>, "(" <scope> ")", ["!"]
 *                 |  <type>
 */
function token (scanner) {
  const node = scanner.enter('token', [])
  // "BREAKING CHANGE"
  const b = breakingChange(scanner)
  if (b instanceof Error) {
    scanner.abort(node)
  } else {
    node.children.push(b)
    return scanner.exit(node)
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
      if (scanner.peek() !== ')') {
        return scanner.abort(node, [')'])
      }
      scanner.next()
    }
    // ["!"]
    const b = breakingChange(scanner)
    if (!(b instanceof Error)) {
      node.children.push(b)
    }
  }
  return scanner.exit(node)
}

/*
 * <breaking-change> ::= "!" | "BREAKING CHANGE"
 */
function breakingChange (scanner) {
  const node = scanner.enter('breaking-change', '')
  if (scanner.peek() === '!') {
    node.value = scanner.next()
  } else if (scanner.peekLiteral('BREAKING CHANGE')) {
    node.value = scanner.next('BREAKING CHANGE'.length)
  }
  if (node.value === '') {
    return scanner.abort(node, ['BREAKING CHANGE'])
  } else {
    return scanner.exit(node)
  }
}

/*
 * <value>        ::= <text> <continuation>*
 *                 |  <text>
 */
function value (scanner) {
  const node = scanner.enter('value', [])
  node.children.push(text(scanner))
  let c
  // <continuation>*
  while (!((c = continuation(scanner)) instanceof Error)) {
    node.children.push(c)
  }
  return scanner.exit(node)
}

/*
 * <newline> <whitespace> <text>
 */
function continuation (scanner) {
  const node = scanner.enter('continuation', [])
  if (isNewline(scanner.peek())) {
    scanner.next()
    const ws = whitespace(scanner)
    if (ws instanceof Error) {
      return ws
    } else {
      node.children.push(ws)
      node.children.push(text(scanner))
    }
  } else {
    return scanner.abort(node)
  }
  return scanner.exit(node)
}

/*
 * <separator>    ::= ":" | " #"
 */
function separator (scanner) {
  const node = scanner.enter('separator', '')
  // ':'
  if (scanner.peek() === ':') {
    node.value = scanner.next()
    return scanner.exit(node)
  }

  // ' #'
  if (scanner.peek() === ' ') {
    scanner.next()
    if (scanner.peek() === '#') {
      scanner.next()
      node.value = ' #'
      return scanner.exit(node)
    } else {
      return scanner.abort(node)
    }
  }

  return scanner.abort(node)
}

/*
 * <whitespace>+   ::= <ZWNBSP> | <TAB> | <VT> | <FF> | <SP> | <NBSP> | <USP>
 */
function whitespace (scanner) {
  const node = scanner.enter('whitespace', '')
  while (isWhitespace(scanner.peek())) {
    node.value += scanner.next()
  }
  if (node.value === '') {
    return scanner.abort(node, [' '])
  }
  return scanner.exit(node)
}

module.exports = message
