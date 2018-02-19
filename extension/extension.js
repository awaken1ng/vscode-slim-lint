const vscode = require('vscode')
const SlimLinter = require('./slim-linter')

exports.activate = function (context) {
  const diagnostics = vscode.languages.createDiagnosticCollection('slim')
  context.subscriptions.push(diagnostics)
  const linter = new SlimLinter(diagnostics)

  const workspace = vscode.workspace
  workspace.onDidChangeConfiguration(linter.updateConfig())
  workspace.textDocuments.forEach((document) => { linter.lint(document) })
  workspace.onDidOpenTextDocument((document) => { linter.lint(document) })
  workspace.onDidSaveTextDocument((document) => { linter.lint(document) })
  workspace.onDidCloseTextDocument((document) => { linter.clear(document) })
}
