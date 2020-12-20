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
      }).to.throw("unexpected token ' ' at position { line: 1, column: 5, offset: 4 } valid tokens [:, (]")
      expect(() => {
        parser('feat( foo ) add support for scopes')
      }).to.throw("unexpected token ' ' at position { line: 1, column: 12, offset: 11 } valid tokens [:]")
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
    it('parses BREAKING CHANGE literal as <token>', () => {
      const parsed = parser('fix: address major bug\nBREAKING CHANGE: this change is breaking')
      parsed.should.matchSnapshot()
    })
    it('supports multiline BREAKING CHANGES, via continuation', () => {
      const parsed = parser('fix: address major bug\nBREAKING CHANGE: first line of breaking change\n second line of breaking change\n third line of breaking change')
      parsed.should.matchSnapshot()
    })
  })
})
