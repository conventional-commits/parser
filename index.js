const Scanner = require('./lib/scanner')
const { isWhitespace, isNewline, isParens } = require('./lib/type-checks')

/*
 * <message>       ::= <summary>, <newline>*, <body>
 *                  |  <summary>
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
    while (isNewline(scanner.peek())) {
      scanner.next()
    }
  } else {
    throw scanner.abort(node)
  }
  node.children.push(body(scanner))
  return scanner.exit(node)
}

/*
 * <summary>      ::= <type> "(" <scope> ")" ["!"] ": " <text>
 *                 |  <type> ["!"] ": " <text>
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

  // ... ": " <text>
  const sep = separator(scanner)
  if (sep instanceof Error) {
    return scanner.abort(node, [!s && '(', !b && '!', ':'])
  } else {
    node.children.push(sep)
  }

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
 * <body>          ::= <footer>+
 *                  | [<text>], <newline>, <body>*
 *                  | [<text>]
 */
function body (scanner) {
  const node = scanner.enter('body', [])
  // 1*<footer>
  while (!scanner.eof()) {
    const f = footer(scanner)
    if (f instanceof Error) {
      scanner.abort(node)
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
      break // The recursive body(scanner) step should consume all tokens.
    } else {
      node.children.push(f)
    }
  }
  return scanner.exit(node)
}

/*
 * <footer>       ::= <token> <separator> *<whitespace> <value> <newline>?
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
 * <value>        ::= <text> 1*<continuation>
 *                 |  <text>
 */
function value (scanner) {
  const node = scanner.enter('value', [])
  node.children.push(text(scanner))
  let c
  // 1*<continuation>
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
    if (isWhitespace(scanner.peek())) {
      scanner.next()
      node.children.push(text(scanner))
    } else {
      return scanner.abort(node)
    }
  } else {
    return scanner.abort(node)
  }
  return scanner.exit(node)
}

/*
 * <separator>    ::= ": " | " #"
 */
function separator (scanner) {
  const node = scanner.enter('separator', '')
  // ': '
  if (scanner.peek() === ':') {
    scanner.next()
    if (scanner.peek() === ' ') {
      node.value = ': '
      scanner.next()
      return scanner.exit(node)
    } else {
      return scanner.abort(node)
    }
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

module.exports = message
