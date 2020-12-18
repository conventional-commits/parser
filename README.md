## Conventional Commits Parser

Reference implementation of Conventional Commits specification.

## The Grammar

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
<SP>           ::= "U+000C"
<NBSP>         ::= "U+00A0"
# See: https://www.ecma-international.org/ecma-262/11.0/index.html#sec-white-space
<USP>          ::= "Any other Unicode “Space_Separator” code point"
<whitespace>   ::= <ZWNBSP> | <TAB> | <VT> | <FF> | <SP> | <NBSP> | <USP>

<message>      ::= <summary> <newline> <newline> 1*<footer>
                |  <summary> <newline> <newline> <body> <newline> <newline> 1*<footer>
                |  <summary> <newline> <newline> <body>
                |  <summary>

<summary>      ::= <type> "(" <scope> ")" ":" <summary-text>
                |  <type> ":" <summary-text>
<type>         ::= 1*<any UTF8-octets except newline or parens or ":" or whitespace>
<scope>        ::= 1*<any UTF8-octets except newline or parens>
<summary-text> ::= 1*<any UTF8-octets except newline>

<footer>       ::= <token> ":" <value>
<token>        ::= <type> "(" <scope> ")"
                |  <type>
                |  "BREAKING CHANGE"
<value>        ::= <summary-text> 1*<continuation>
                |  <summary-text>
<continuation> ::= <newline> <whitespace> <summary-text>

<body>         ::= 1*<body-text>
<body-text>    ::= <newline>? <summary-text>
```
