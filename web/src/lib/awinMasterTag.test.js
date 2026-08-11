import { describe, expect, it } from 'vitest'
import { ensureAwinMasterTag, mustReloadWithoutAwin, shouldLoadAwinMasterTag } from './awinMasterTag.js'

const prod = (pathname) => ({
  hostname: 'www.bysolum.co.uk',
  pathname,
  webdriver: false,
})

describe('shouldLoadAwinMasterTag', () => {
  it.each(['/', '/full', '/guide', '/guide/back-care', '/ritual', '/product/body-wash', '/success'])(
    'allows the public route %s',
    (pathname) => expect(shouldLoadAwinMasterTag(prod(pathname))).toBe(true),
  )

  it.each(['/buy', '/checkout', '/account', '/creators', '/contact', '/confirm', '/email-preview'])(
    'blocks the sensitive route %s',
    (pathname) => expect(shouldLoadAwinMasterTag(prod(pathname))).toBe(false),
  )

  it('blocks development and WebDriver', () => {
    expect(shouldLoadAwinMasterTag({ ...prod('/'), hostname: 'localhost' })).toBe(false)
    expect(shouldLoadAwinMasterTag({ ...prod('/'), webdriver: true })).toBe(false)
  })

  it('requires one clean document reload when an executed tag reaches a blocked route', () => {
    expect(mustReloadWithoutAwin({ pathname: '/buy', masterTagPresent: true })).toBe(true)
    expect(mustReloadWithoutAwin({ pathname: '/buy', masterTagPresent: false })).toBe(false)
  })

})

describe('ensureAwinMasterTag', () => {
  it('adds the MasterTag once', () => {
    const appendedScripts = []
    const documentRef = {
      getElementById: (id) => appendedScripts.find((script) => script.id === id) || null,
      createElement: () => ({}),
      body: { appendChild: (script) => appendedScripts.push(script) },
    }

    expect(ensureAwinMasterTag(documentRef)).toMatchObject({
      id: 'solum-awin-mastertag',
      defer: true,
    })
    expect(ensureAwinMasterTag(documentRef)).toBeNull()
    expect(appendedScripts).toHaveLength(1)
  })
})
