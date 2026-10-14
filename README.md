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

The contact link on these pages comes from the `errorPages` option of `createNunjucksConfig` (or `createNunjucksContextBuilder`), exposed to templates as `errorPages`. The key is optional:

```js
createNunjucksConfig({
  config,
  logger,
  getRequestBasePath,
  errorPages: {
    contactHref:
      'https://www.gov.uk/government/organisations/british-cattle-movement-service' // default
  }
})
```

## Layout scripts

`layoutComponents` from `@defra/lis-infra-ui-services/components/layout` is the list of GOV.UK Frontend components the layout template renders: Service navigation and Skip link.

`errorPageComponents` from `@defra/lis-infra-ui-services/components/error-pages` is the list the shared error pages render (Button, for the not-authorised sign-in button). Every app that serves the shared error pages must add it.

Start each with `createAll`, alongside any page-level components (see the full example under [Scrollable table](#scrollable-table)).

Wrap the combined list in a `Set`, so a component that appears in more than one list (or that the app also lists itself) is only initialised once: govuk's base class logs an InitError on double init.

### Scrollable table

Apps that render the sortable paginated table macro also start `ScrollableTable` from `@defra/lis-infra-ui-services/components/scrollable-table`. It drops the tab stop (and the region role and label) from a table wrapper that fits, and restores them when the table overflows, re-checking whenever the wrapper or table changes size. Without JavaScript the wrapper stays focusable.

```js
import { createAll, Tabs } from 'govuk-frontend'
import { errorPageComponents } from '@defra/lis-infra-ui-services/components/error-pages'
import { layoutComponents } from '@defra/lis-infra-ui-services/components/layout'
import { ScrollableTable } from '@defra/lis-infra-ui-services/components/scrollable-table'

for (const component of new Set([
  ...layoutComponents,
  ...errorPageComponents,
  ScrollableTable,
  Tabs
])) {
  createAll(component)
}
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
