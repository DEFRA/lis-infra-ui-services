/** The plugin name, also the key of its route options and of request.plugins. */
export const CSRF_PLUGIN_NAME = 'lis-csrf'

/** The form field that carries the token. */
export const CSRF_FIELD_NAME = '_csrf'

/** The header a hub sends a spoke the token in, taken from the hub session. */
export const CSRF_TOKEN_HEADER = 'x-lis-csrf-token'

/**
 * The yar session key a hub keeps the token under. @defra/lis-hubs-infra-access
 * clears the same key at sign-in, as it cannot import this package.
 */
export const CSRF_SESSION_KEY = 'lis-csrf-token'
