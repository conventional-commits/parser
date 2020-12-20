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

```ebnf
/* See: https://tools.ietf.org/html/rfc3629#section-4 */
<UTF8-char>     ::= "Placeholder for UTF-8 grammar"
<UTF8-octets>   ::= <UTF8-char>+

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
/* See: https://www.ecma-international.org/ecma-262/11.0/index.html#sec-white-space */
<USP>          ::= "Any other Unicode 'Space_Separator' code point"
/* Any non-newline whitespace: */
<whitespace>   ::= <ZWNBSP> | <TAB> | <VT> | <FF> | <SP> | <NBSP> | <USP>

<message>      ::= <summary> <newline> <body-footer>
               |  <summary>

<summary>      ::= <type> "(" <scope> ")" "!"? ":" <whitespace>* <text>
               |  <type> "!"? ":" <whitespace>* <text>
<type>         ::= <any UTF8-octets except newline or parens or ":" or "!:" or whitespace>+
<scope>        ::= <any UTF8-octets except newline or parens>+
<text>         ::= <any UTF8-octets except newline>+

/* Note: if the first <body> node starts with "BREAKING CHANGE:" this should
 * be treated by parsers as a breaking change marker upstream:
 */
<body-footer>  ::= <footer>+
               | <body> <newline> <body-footer>*
               | <body>
<body>         ::= <text>?

<footer>       ::= <token> <separator> <whitespace>* <value> <newline>?
<token>        ::= "BREAKING CHANGE"
               |  <type> "(" <scope> ")" "!"?
               |  <type> "!"?
<separator>    ::= ":" | " #"
<value>        ::= <text> <continuation>+
               | <text>
<continuation> ::= <newline> <whitespace> <text>
```
