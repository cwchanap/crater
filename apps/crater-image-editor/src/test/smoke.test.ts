/// <reference types="mocha" />

import * as assert from 'assert'
import * as vscode from 'vscode'

suite('Crater Image Editor Extension', () => {
    test('provides VS Code APIs', () => {
        assert.strictEqual(typeof vscode.workspace.getConfiguration, 'function')
    })

    test('ensures sample test runs', () => {
        assert.strictEqual(true, true)
    })
})
