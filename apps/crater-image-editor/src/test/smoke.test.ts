/// <reference types="mocha" />

import { strictEqual } from 'assert'
import { workspace } from 'vscode'

suite('Crater Image Editor Extension', () => {
    test('provides VS Code APIs', () => {
        strictEqual(typeof workspace.getConfiguration, 'function')
    })

    test('ensures sample test runs', () => {
        strictEqual(true, true)
    })
})
