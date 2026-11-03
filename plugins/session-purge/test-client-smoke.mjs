import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8')

let captured = null
const element = (type, props, ...children) => ({
  type,
  props: {
    ...(props || {}),
    children: children.length > 0
      ? children.flat(Infinity).filter((child) => child !== undefined && child !== null)
      : (props && props.children) || [],
  },
})

const React = {
  createElement: element,
  Fragment: Symbol('Fragment'),
  useState(initial) {
    return [typeof initial === 'function' ? initial() : initial, () => {}]
  },
  useEffect() {},
  useCallback(fn) {
    return fn
  },
}

const primitives = {
  Button: (props) => element('button', props),
  IconTrashOutlineRegular: () => null,
  MenuItemButton: (props) => element('menuitem', props),
  Modal: (props) => element('modal', props),
  Tooltip: (props) => element('tooltip', props),
}

globalThis.window = {
  __ModuleLoader__: {
    load(spec) {
      captured = spec.factory((name) => {
        if (name === 'react') return React
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
        throw new Error(`unexpected require: ${name}`)
      })
    },
  },
}
globalThis.document = { querySelector: () => ({}) }

const factory = new Function('window', 'document', source)
factory(globalThis.window, globalThis.document)
assert.ok(captured, 'client bundle registered')
assert.deepEqual(captured.inject, ['slots'])

const registrations = []
const ctx = {
  get: () => undefined,
  inject(deps, callback) {
    callback({})
  },
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  slots: {
    inject(_name, callback) {
      return callback()
    },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  },
}

captured.apply(ctx)
const byName = (name) => registrations.find((entry) => entry.options.name === name)
assert.ok(byName('conversation.session.header.actions'), 'header action registered')
assert.ok(byName('sidebar.workspaces.session.menu.item'), 'row menu registered')
assert.ok(byName('shell.overlay'), 'dialog overlay registered')

const summary = { running: true, displayTitle: '测试会话', title: '测试会话' }
const useSessions = (selector) => selector({ byId: { 'session-1': summary } })

const header = byName('conversation.session.header.actions').component({
  sessionId: 'session-1',
  useSessions,
})
const tooltip = header
assert.equal(tooltip.type, primitives.Tooltip)
const button = tooltip.props.children
assert.equal(button.type, primitives.Button)
assert.equal(button.props.variant, 'ghost')
assert.ok(String(button.props['aria-label']).includes('彻底删除会话'))

const menu = byName('sidebar.workspaces.session.menu.item').component({
  sessionId: 'session-1',
  displayTitle: '测试会话',
  useSessions,
  useMenuOpenState: () => [false, () => {}],
})
assert.equal(menu.type, primitives.MenuItemButton)
assert.equal(menu.props.danger, true)
assert.equal(menu.props.separatorBefore, true)
assert.equal(menu.props.children[0], '彻底删除会话')

const overlay = byName('shell.overlay').component({})
assert.equal(overlay, null, 'no dialog without a request')

console.log('client smoke passed')
