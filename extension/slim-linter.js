const childProcess = require('child_process')
const vscode = require('vscode')

class SlimLinter {
  constructor (diagnostics) {
    this.diagnostics = diagnostics
    this.updateConfig()
  }

  lint (document) {
    if (document.languageId !== 'slim' || document.isUntitled || document.uri.scheme !== 'file') {
      return
    }

    // Path check
    let path = this.config.get('path', '')
    if (path === '') {
      vscode.window.showErrorMessage('slim-lint path is not specified')
      return
    }

    // Asynchronously run slim-lint
    let linter = childProcess.exec(
      `${path} --reporter json ${document.fileName}`,
      {'cwd': vscode.workspace.rootPath} // Current working directory
    )

    // Wait for linter to return the report
    linter.stdout.on('data', (report) => {
      this.diagnostics.delete(document.uri)
      report = JSON.parse(report)

      // Parse the report
      let entries = []
      report.files.forEach((file) => {
        // Parse offenses for the file
        let diagnostics = []
        file.offenses.forEach((offense) => {
          // Create Range object for the whole line
          let line = offense.location.line - 1
          let range = new vscode.Range(
            line, 0,
            line, document.lineAt(line).range.end.character
          )

          // Format the message in '<msg> (<rule>)' format if rule is present
          let message = offense.message.split(': ')
          if (message.length === 1) {
            message = message[0]
          } else if (message.length === 2) {
            message = `${message[1]} (${message[0]})` // msg (rule)
          } else {
            vscode.window.showErrorMessage('Slim-Lint: FIXME: failed to parse the offense message')
          }

          // Any other severity levels aside from warning and error?
          let severity = null
          switch (offense.severity) {
            case 'warning': severity = vscode.DiagnosticSeverity.Warning; break
            case 'error': severity = vscode.DiagnosticSeverity.Error; break
            default: severity = vscode.DiagnosticSeverity.Error
          }

          let diagnostic = new vscode.Diagnostic(range, message, severity)
          diagnostics.push(diagnostic)
        })
        entries.push([document.uri, diagnostics])
      })
      this.diagnostics.set(entries)
    })
  }

  clear (document) {
    if (document.uri.scheme === 'file') {
      this.diagnostics.delete(document.uri)
    }
  }

  updateConfig (config) {
    this.config = vscode.workspace.getConfiguration('slim-lint')
  }
}

module.exports = SlimLinter
