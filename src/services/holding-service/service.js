import { getLoggerForConfig } from '../../logging/index.js'

/**
 * @param {{ config: object, fetchImpl?: Function }} options
 * @returns {Function}
 */
export function createHoldingService({ config, fetchImpl = globalThis.fetch }) {
    const logger = getLoggerForConfig(config)

    if (!config?.get) {
        throw new TypeError('Holding service requires a config object with a get method')
    }

    if (typeof fetchImpl !== 'function') {
        throw new TypeError('Holding service requires a fetch implementation')
    }

    return async function fetchHolding(cph, accessToken = null) {
        const holdingService = getHoldingServiceConfig(config)

        if (!holdingService.url) {
            throw new TypeError('Holding service is enabled but not configured')
        }

        const headers = {
            accept: 'application/json'
        }

        if (holdingService.apiKey) {
            headers[holdingService.apiKeyHeader] = holdingService.apiKey
        }

        if (accessToken) {
            headers.authorization = `Bearer ${accessToken}`
        }

        const holdingUrl = new URL(holdingService.url)
        holdingUrl.searchParams.set('holding', cph)

        logger.info(`Getting holding ${cph}`)
        const response = await fetchImpl(holdingUrl.toString(), {
            method: 'GET',
            headers
        })

        if (!response.ok) {
            const responseText = await response.text()
            logger.error(`Holding service request failed with ${response.status}: ${responseText}`)
            throw new TypeError(`Holding service request failed with ${response.status}: ${responseText}`)
        }

        const result = await response.json()
        logger.info(`Got holding ${cph}: ${JSON.stringify(result)}`)
        return buildHoldingResponse(result)
    }
}

function buildHoldingResponse(holding = {}) {
    return {
        ...holding
    }
}

function getHoldingServiceConfig(config) {
    return {
        url: config.get('holdingService.url'),
        apiKey: config.get('holdingService.apiKey'),
        apiKeyHeader: config.get('holdingService.apiKeyHeader')
    }
}
