## Conventional Commits Parser

Reference implementation of Conventional Commits specification.

Outputs a tree structure based on the
[uninst specification](https://github.com/syntax-tree/unist).

## Usage

```js
const parser = require('@conventional-commits/parser')
parser('feat(parser): add support for scopes')
```

## The Grammar

This parsing library is based on the following grammar. An effort will be made
to keep this in sync with the written specification on conventionalcommits.org.

```bnf
# See: https://tools.ietf.org/html/rfc3629#section-4
<UTF8-octets>  ::= 1*<UTF8-char>
<CR>           ::= "0x000D"
<LF>           ::= "0x000A"
<newline>      ::= <CR>? <LF>
<parens>       ::= "(" | ")"
<ZWNBSP>       ::= "U+FEFF"
<TAB>          ::= "U+0009"
<VT>           ::= "U+000B"
<FF>           ::= "U+000C"
<SP>           ::= "U+0020"
<NBSP>         ::= "U+00A0"
# See: https://www.ecma-international.org/ecma-262/11.0/index.html#sec-white-space
<USP>          ::= "Any other Unicode “Space_Separator” code point"
<whitespace>   ::= <ZWNBSP> | <TAB> | <VT> | <FF> | <SP> | <NBSP> | <USP>

<message>      ::= <summary> <newline> <newline> <body-footer>
                |  <summary>

<summary>      ::= <type> "(" <scope> ")" ":" <text>
                |  <type> ":" <text>
<type>         ::= 1*<any UTF8-octets except newline or parens or ":" or whitespace>
<scope>        ::= 1*<any UTF8-octets except newline or parens>
<text>         ::= 1*<any UTF8-octets except newline>

<body-footer>  ::= 1*<footer>
               ::= <body> <newline> 1*<body-footer>
               ::= <body>

<footer>       ::= <token> ":" <value>
<token>        ::= <type> "(" <scope> ")"
                |  <type>
                |  "BREAKING CHANGE"
<value>        ::= <text> 1*<continuation>
                |  <text>
<continuation> ::= <newline> <whitespace> <text>

<body>         ::= <text>? <newline>
```

### Parsing Notes:

* The parser should ignore whitespace between symbols, i.e., `fix : the bug`
  is equivalent to `fix: the bug`.
