/** The plugin name, also the key of its route options and of request.plugins. */
export const CSRF_PLUGIN_NAME = 'lis-csrf'

/** The form field that carries the token. */
export const CSRF_FIELD_NAME = '_csrf'

/** The header a hub sends a spoke the token in, taken from the hub session. */
export const CSRF_TOKEN_HEADER = 'x-lis-csrf-token'
