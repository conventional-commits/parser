const parse = require('.')
const inspect = require('unist-util-inspect')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')(hideBin(process.argv))

const argv = yargs
  .command('$0', 'Output the parsed syntax tree\n\nUsage: npm run inspect <message>')
  .argv

const message = argv._[0]

if (message) {
  console.log(inspect(parse(message)))
} else {
  yargs.showHelp()
}
