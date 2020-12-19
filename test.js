const { describe, beforeEach, it } = require('mocha')
const chaiJestSnapshot = require('chai-jest-snapshot')
const parser = require('./')

require('chai')
  .use(chaiJestSnapshot)
  .should()

describe('parser', () => {
  beforeEach(function () {
    this.currentTest.file = `./snapshots/${this.currentTest.file}`
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
  })
  // TODO: figure out how we handle '!' character, since it can be tied
  // find out from wooorm if node can both have children and have a value.
})
