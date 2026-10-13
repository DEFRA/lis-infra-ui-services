# Livestock ui-services

This package contains the shared topology metadata and route helpers used across the hub, spokes, and services.

Install dependencies for this package locally with `npm install` from this directory.

## Error pages

`catchAll` from `@defra/lis-infra-ui-services/errors`, registered as an `onPreResponse` extension, renders one of four shared pages from `src/nunjucks/routes/error/` by status code:

| Status        | Page                   |
| ------------- | ---------------------- |
| 404           | `page-not-found`       |
| 401, 403      | `not-authorised`       |
| 503           | `service-unavailable`  |
| anything else | `problem-with-service` |

The links on these pages come from the `errorPages` option of `createNunjucksConfig` (or `createNunjucksContextBuilder`), exposed to templates as `errorPages`. Every key is optional:

```js
createNunjucksConfig({
  config,
  logger,
  getRequestBasePath,
  errorPages: {
    contactHref:
      'https://www.gov.uk/government/organisations/british-cattle-movement-service', // default
    homeHref: '/', // default, "Home page" on page not found
    getStartedHref: '/' // default, "Get started" on page not found
  }
})
```

## Scheduled maintenance

Each hub switches maintenance on with its own config value, `maintenance.availableFrom`: the UK local date-time the service is back, in ISO 8601 form without an offset, e.g. `2026-11-19T09:00` or `2026-11-19T09:00:00`. Values with a `Z` or `+hh:mm` offset, and dates without a time, throw at start-up. An empty value leaves the service running as normal.

```js
// config.js
maintenance: {
  availableFrom: {
    doc: 'UK local date-time the service is back from, without an offset; empty when not in maintenance',
    format: String,
    default: '',
    env: 'MAINTENANCE_AVAILABLE_FROM'
  }
}

// server.js, after @hapi/vision is registered
import { createMaintenancePlugin } from '@defra/lis-infra-ui-services/maintenance'

await server.register(
  createMaintenancePlugin({
    availableFrom: config.get('maintenance.availableFrom'),
    healthPath: '/health', // default
    assetPath: config.get('assetPath') // default '/public'
  })
)
```

While `availableFrom` is set, every request except the health check and assets under `assetPath` gets the service unavailable page with a 503, showing the time as "9am on Thursday 19 November 2026" and carrying it in a `Retry-After` header.
