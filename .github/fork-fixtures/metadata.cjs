const fs = require('node:fs')
const { readBuilderReleaseNotes } = require('../../scripts/release/hotfix-release-notes')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

if (process.argv[2] === 'prepare') {
  pkg.version = process.env.REQUESTED_VERSION
  fs.writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`)
  const block = readBuilderReleaseNotes(fs.readFileSync('electron-builder.yml', 'utf8'))
  const notes = `<!--LANG:en-->\nFORK SMOKE TEST ONLY: ${pkg.version}. Not an application release.\n<!--LANG:zh-CN-->\n仅用于 fork 流程测试：${pkg.version}，不是应用发布。\n<!--LANG:END-->`
  fs.writeFileSync('electron-builder.yml', [...block.lines.slice(0, block.start), ...notes.split('\n').map(line => `    ${line}`), ...block.lines.slice(block.end)].join('\n'))
} else if (process.argv[2] === 'manifest') {
  const file = 'resources/builtin-agents/cherry-assistant/product-manifest.json'
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  manifest.package.version = pkg.version
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
} else {
  throw new Error('Expected prepare or manifest')
}
