const { describe, beforeEach, it } = require('mocha')
const { expect } = require('chai')
const chaiJestSnapshot = require('chai-jest-snapshot')
const parser = require('./')

require('chai')
  .use(chaiJestSnapshot)
  .should()

describe('<message>', () => {
  beforeEach(function () {
    chaiJestSnapshot.configureUsingMochaContext(this)
  })
  describe('<summary>', () => {
    it('parses summary with no scope', () => {
      const parsed = parser('fix: a really weird bug')
      parsed.should.matchSnapshot()
    })
    it('parses summary with scope', () => {
      const parsed = parser('feat(parser): add support for scopes')
      parsed.should.matchSnapshot()
    })
    it('parses breaking change marker', () => {
      let parsed = parser('feat!: add support for scopes')
      parsed.should.matchSnapshot()
      parsed = parser('feat(http parser)!: add support for scopes')
      parsed.should.matchSnapshot()
    })
    it('throws error when ":" token is missing', () => {
      expect(() => {
        parser('feat add support for scopes')
      }).to.throw("unexpected token ' ' at position 1:5 valid tokens [(, !, :]")
      expect(() => {
        parser('feat( foo ) add support for scopes')
      }).to.throw("unexpected token ' ' at position 1:12 valid tokens [!, :]")
      expect(() => {
        parser('feat(bar)! add support for breaking change')
      }).to.throw("unexpected token ' ' at position 1:11 valid tokens [:]")
    })
    it('throws error when closing ")" token is missing', () => {
      expect(() => {
        parser('feat(foo: add support for scopes')
      }).to.throw('unexpected token EOF valid tokens [)]')
    })
  })
  describe('<footer>', () => {
    it('parses simple token/separator/value form of footer', () => {
      const parsed = parser('fix: address major bug\nAuthor: @byCedric')
      parsed.should.matchSnapshot()
    })
    it('parses commit summary footer', () => {
      const parsed = parser('chore: contains multiple commits\nfix(parser): address bug with parser')
      parsed.should.matchSnapshot()
    })
    it('parses commit summary footer, with breaking change marker', () => {
      const parsed = parser('chore: contains multiple commits\nfeat(parser)!: address bug with parser')
      parsed.should.matchSnapshot()
    })
    it('parses BREAKING CHANGE literal as <token>', () => {
      const parsed = parser('fix: address major bug\nBREAKING CHANGE: this change is breaking')
      parsed.should.matchSnapshot()
    })
    it('supports multiline BREAKING CHANGES, via continuation', () => {
      const parsed = parser('fix: address major bug\nBREAKING CHANGE: first line of breaking change\n second line of breaking change\n third line of breaking change')
      parsed.should.matchSnapshot()
    })
  })
  describe('<summary>, <newline>*, <body>', () => {
    it('treats multiple newline between body and summary as optional', () => {
      const parsed = parser('fix: address major bug\nthis is a free form body of text')
      parsed.should.matchSnapshot()
    })
    it('allows for multiple newlines between summary and body', () => {
      const parsed = parser('fix: address major bug\n\nthis is a free form body of text')
      parsed.should.matchSnapshot()
    })
  })
  describe('[<text>], <newline>, <footer>*', () => {
    it('parses footer after body', () => {
      const parsed = parser('fix: address major bug\n\nthis is a free form body of text\nAuthor: @bcoe\nRefs #392')
      parsed.should.matchSnapshot()
    })
    it('parses footer after multi-line body', () => {
      const parsed = parser('fix: address major bug\n\nthis is the first line of the body\n\nthis is the second line of body\n\nAuthor: @bcoe\nRefs #392')
      parsed.should.matchSnapshot()
    })
  })
})
