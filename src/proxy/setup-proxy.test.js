import assert from 'node:assert/strict'
import { test } from 'vitest'

import { setupProxy } from './setup-proxy.js'

test('setupProxy does nothing when no proxy URL is provided', () => {
  const infoMessages = []
  const logger = {
    info(message) {
      infoMessages.push(message)
    }
  }
  let dispatcherCalls = 0
  let bootstrapCalls = 0
  const globalObject = {}

  setupProxy({
    proxyUrl: null,
    logger,
    createProxyAgentFn() {
      throw new Error('should not create proxy agent')
    },
    setGlobalDispatcherFn() {
      dispatcherCalls += 1
    },
    bootstrapFn() {
      bootstrapCalls += 1
    },
    globalObject
  })

  assert.deepEqual(infoMessages, [])
  assert.equal(dispatcherCalls, 0)
  assert.equal(bootstrapCalls, 0)
  assert.equal(globalObject.GLOBAL_AGENT, undefined)
})

test('setupProxy configures global proxy clients when a proxy URL is provided', () => {
  const infoMessages = []
  const logger = {
    info(message) {
      infoMessages.push(message)
    }
  }
  const createdAgents = []
  const dispatchedAgents = []
  let bootstrapCalls = 0
  const globalObject = {}

  setupProxy({
    proxyUrl: 'http://localhost:8080',
    logger,
    createProxyAgentFn(proxyUrl) {
      const agent = { proxyUrl }
      createdAgents.push(agent)
      return agent
    },
    setGlobalDispatcherFn(agent) {
      dispatchedAgents.push(agent)
    },
    bootstrapFn() {
      bootstrapCalls += 1
    },
    globalObject
  })

  assert.deepEqual(infoMessages, ['setting up global proxies'])
  assert.equal(bootstrapCalls, 1)
  assert.deepEqual(createdAgents, [{ proxyUrl: 'http://localhost:8080' }])
  assert.deepEqual(dispatchedAgents, [{ proxyUrl: 'http://localhost:8080' }])
  assert.equal(globalObject.GLOBAL_AGENT.HTTP_PROXY, 'http://localhost:8080')
})
