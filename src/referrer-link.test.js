import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import { createReferrerLink, getSameHostReferrerPath } from './referrer-link.js'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const mocks = {
  get: vi.fn(),
  set: vi.fn(),
  cache: vi.fn()
}

const server = { cache: mocks.cache }

function createRequest({ query = {}, headers = {}, sub = 'user-1' } = {}) {
  return {
    query,
    headers: { 'x-forwarded-host': 'back-office.lis.defra', ...headers },
    auth: { credentials: { user: sub ? { sub } : undefined } }
  }
}

describe('getSameHostReferrerPath()', () => {
  test('it returns the path and query of a referrer on the forwarded host', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'https://back-office.lis.defra/holdings?search=oak&page=2',
        'x-forwarded-host': 'back-office.lis.defra',
        host: 'localhost:3221'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBe('/holdings?search=oak&page=2')
  })

  test('it ignores a referrer on another host', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'https://evil.example/holdings',
        'x-forwarded-host': 'back-office.lis.defra'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBeUndefined()
  })

  test('it ignores a referrer path that would point at another site', () => {
    // Arrange
    const request = {
      headers: {
        referer: 'https://back-office.lis.defra//evil.example',
        'x-forwarded-host': 'back-office.lis.defra'
      }
    }

    // Act
    const result = getSameHostReferrerPath(request)

    // Assert
    expect(result).toBeUndefined()
  })

  test('it returns undefined when there is no referrer or it is not a URL', () => {
    // Arrange
    const noReferrer = { headers: { host: 'back-office.lis.defra' } }
    const badReferrer = {
      headers: { referer: 'not a url', host: 'back-office.lis.defra' }
    }

    // Act
    const first = getSameHostReferrerPath(noReferrer)
    const second = getSameHostReferrerPath(badReferrer)

    // Assert
    expect(first).toBeUndefined()
    expect(second).toBeUndefined()
  })
})

describe('createReferrerLink()', () => {
  beforeAll(() => {
    mocks.cache.mockReturnValue({ get: mocks.get, set: mocks.set })
    mocks.get.mockResolvedValue(null)
    mocks.set.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function createSubject(overrides = {}) {
    return createReferrerLink(server, {
      cacheName: 'test-cache',
      allow: (path) => path === '/holdings' || path.startsWith('/holdings?'),
      fallbackHref: '/holdings',
      ...overrides
    })
  }

  test('it provisions a cache segment with the given name and expiry', () => {
    // Arrange
    const expiresIn = 1234

    // Act
    createSubject({ segment: 'list-referrer', expiresIn })

    // Assert
    expect(mocks.cache).toHaveBeenCalledWith({
      cache: 'test-cache',
      segment: 'list-referrer',
      expiresIn
    })
  })

  test('it throws when the cache name, allow rule or fallback is missing', () => {
    // Arrange
    const incomplete = [
      { allow: () => true, fallbackHref: '/x' },
      { cacheName: 'c', fallbackHref: '/x' },
      { cacheName: 'c', allow: () => true }
    ]

    // Act
    const errors = incomplete.map((options) => {
      try {
        createReferrerLink(server, options)
        return undefined
      } catch (e) {
        return e
      }
    })

    // Assert
    expect(errors.map((e) => e?.message)).toEqual([
      'createReferrerLink() requires a cacheName',
      'createReferrerLink() requires an allow function',
      'createReferrerLink() requires a fallbackHref'
    ])
  })

  test('it remembers an allowed same-host referrer under a new id for the user', async () => {
    // Arrange
    const subject = createSubject()
    const request = createRequest({
      headers: {
        referer: 'https://back-office.lis.defra/holdings?search=oak&page=2'
      }
    })

    // Act
    const result = await subject.resolve(request)

    // Assert
    expect(result.href).toBe('/holdings?search=oak&page=2')
    expect(result.id).toMatch(uuidPattern)
    expect(mocks.set).toHaveBeenCalledWith(
      `user-1:${result.id}`,
      '/holdings?search=oak&page=2'
    )
  })

  test('it resolves a carried id from the cache for the same user', async () => {
    // Arrange
    const subject = createSubject()
    const id = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f'
    mocks.get.mockResolvedValueOnce('/holdings?search=oak')
    const request = createRequest({ query: { referrer: id } })

    // Act
    const result = await subject.resolve(request)

    // Assert
    expect(mocks.get).toHaveBeenCalledWith(`user-1:${id}`)
    expect(result).toEqual({ id, href: '/holdings?search=oak' })
    expect(mocks.set).not.toHaveBeenCalled()
  })

  test('it falls back when a carried id is unknown, expired or not a uuid', async () => {
    // Arrange
    const subject = createSubject()
    const unknown = createRequest({
      query: { referrer: '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f' }
    })
    const malformed = createRequest({ query: { referrer: '../etc' } })

    // Act
    const first = await subject.resolve(unknown)
    const second = await subject.resolve(malformed)

    // Assert
    expect(first).toEqual({ id: null, href: '/holdings' })
    expect(second).toEqual({ id: null, href: '/holdings' })
    expect(mocks.get).toHaveBeenCalledTimes(1)
  })

  test('it falls back when the referrer is not allowed, off-host or missing', async () => {
    // Arrange
    const subject = createSubject()
    const notAllowed = createRequest({
      headers: { referer: 'https://back-office.lis.defra/cattle/holdings/1' }
    })
    const offHost = createRequest({
      headers: { referer: 'https://evil.example/holdings' }
    })
    const missing = createRequest()

    // Act
    const results = await Promise.all(
      [notAllowed, offHost, missing].map((request) => subject.resolve(request))
    )

    // Assert
    expect(results).toEqual([
      { id: null, href: '/holdings' },
      { id: null, href: '/holdings' },
      { id: null, href: '/holdings' }
    ])
    expect(mocks.set).not.toHaveBeenCalled()
  })

  test('it never remembers or resolves anything for a request without a user', async () => {
    // Arrange
    const subject = createSubject()
    const request = createRequest({
      sub: null,
      query: { referrer: '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f' },
      headers: { referer: 'https://back-office.lis.defra/holdings' }
    })

    // Act
    const result = await subject.resolve(request)

    // Assert
    expect(result).toEqual({ id: null, href: '/holdings' })
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.set).not.toHaveBeenCalled()
  })

  test('it returns null when the request is ruled out by "when"', async () => {
    // Arrange
    const subject = createSubject({ when: () => false })
    const request = createRequest({
      headers: { referer: 'https://back-office.lis.defra/holdings' }
    })

    // Act
    const result = await subject.resolve(request)

    // Assert
    expect(result).toBeNull()
    expect(mocks.set).not.toHaveBeenCalled()
  })

  test('it appends the id to a link, after any existing query', () => {
    // Arrange
    const subject = createSubject({ queryParam: 'from' })
    const id = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f'

    // Act
    const plain = subject.link('/cattle/holdings/22/001/0001', id)
    const withQuery = subject.link('/cattle/holdings/x/animals?page=2', id)
    const noId = subject.link('/cattle/holdings/22/001/0001', null)

    // Assert
    expect(plain).toBe(`/cattle/holdings/22/001/0001?from=${id}`)
    expect(withQuery).toBe(`/cattle/holdings/x/animals?page=2&from=${id}`)
    expect(noId).toBe('/cattle/holdings/22/001/0001')
  })
})
