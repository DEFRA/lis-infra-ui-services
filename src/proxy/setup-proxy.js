import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for a number of http clients.
 * Node Fetch will still need to pass a ProxyAgent in on each call.
 * @param {object} options
 * @param {string} options.proxyUrl
 * @param {object} [options.logger]
 * @param {Function} [options.createProxyAgentFn]
 * @param {Function} [options.setGlobalDispatcherFn]
 * @param {Function} [options.bootstrapFn]
 * @param {object} [options.globalObject]
 * @returns {void}
 */
export function setupProxy({
  proxyUrl,
  logger,
  createProxyAgentFn,
  setGlobalDispatcherFn,
  bootstrapFn,
  globalObject = global
}) {
  if (!proxyUrl) {
    return
  }

  const undiciModule =
    createProxyAgentFn && setGlobalDispatcherFn ? null : require('undici')
  const globalAgentModule = bootstrapFn ? null : require('global-agent')
  const resolvedCreateProxyAgentFn =
    createProxyAgentFn ?? ((url) => new undiciModule.ProxyAgent(url))
  const resolvedSetGlobalDispatcherFn =
    setGlobalDispatcherFn ?? undiciModule.setGlobalDispatcher
  const resolvedBootstrapFn = bootstrapFn ?? globalAgentModule.bootstrap

  logger?.info?.('setting up global proxies')
  resolvedSetGlobalDispatcherFn(resolvedCreateProxyAgentFn(proxyUrl))

  resolvedBootstrapFn()
  globalObject.GLOBAL_AGENT ??= {}
  globalObject.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
}
