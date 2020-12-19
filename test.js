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
    it('throws error when ":" token is missing', () => {
      expect(() => {
        parser('feat add support for scopes')
      }).to.throw("unexpected token 'a' at position 5 valid tokens [:, (]")
      expect(() => {
        parser('feat( foo ) add support for scopes')
      }).to.throw("unexpected token 'a' at position 12 valid tokens [:]")
    })
    it('throws error when closing ")" token is missing', () => {
      expect(() => {
        parser('feat (foo: add support for scopes')
      }).to.throw('unexpected token EOF valid tokens [)]')
    })
  })
  // TODO: figure out how we handle '!' character, since it can be tied
  // find out from wooorm if node can both have children and have a value.
})
