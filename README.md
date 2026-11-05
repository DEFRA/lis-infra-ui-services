# lis-infra-ui-services

Part of the Livestock Information Service (LIS), which lets livestock keepers, owners, agents and
delegates record and manage their animals.

`@defra/lis-infra-ui-services` is a shared npm package with the UI building blocks that LIS hubs and
spokes share: the page layout, shared error pages, scheduled maintenance, Nunjucks setup, GOV.UK
Frontend scripts and styles, static files, security headers and session cache.

The templates follow the [GOV.UK Design System](https://design-system.service.gov.uk/).

Used by:

- hubs: [lis-hubs-front-office](https://github.com/DEFRA/lis-hubs-front-office), [lis-hubs-back-office](https://github.com/DEFRA/lis-hubs-back-office)
- spokes: [lis-apps-cattle-home](https://github.com/DEFRA/lis-apps-cattle-home), [lis-apps-cattle-register](https://github.com/DEFRA/lis-apps-cattle-register), [lis-apps-cattle-move](https://github.com/DEFRA/lis-apps-cattle-move), [lis-apps-cattle-death](https://github.com/DEFRA/lis-apps-cattle-death), [lis-apps-sheep-home](https://github.com/DEFRA/lis-apps-sheep-home)

## Installation

```bash
npm install @defra/lis-infra-ui-services \
  @defra/lis-hubs-infra-access @defra/lis-hubs-infra-core @defra/lis-hubs-infra-registry govuk-frontend
```

These are peer dependencies, so the consuming app must install them too:

- `@defra/lis-hubs-infra-access` `>=0.29.0 <1.0.0`
- `@defra/lis-hubs-infra-core` `>=0.4.0 <1.0.0`
- `@defra/lis-hubs-infra-registry` `>=0.6.0 <1.0.0`
- `govuk-frontend` `>=6.5.0 <7.0.0`

## Usage

Import from the subpath you need, for example `@defra/lis-infra-ui-services/errors`. The package
has no config of its own. Each function takes the values it needs from the consuming app's
[convict](https://github.com/mozilla/node-convict) `config`.

### Nunjucks

`createNunjucksConfig` returns a registration for `@hapi/vision`. It sets up Nunjucks with the
GOV.UK Frontend templates, this package's layout (`layouts/base.njk`) and components, and the shared
error pages. It also adds the filters and globals, and a view context with `assetPath`,
`serviceName`, `getAssetPath`, `isSignedIn`, `hasPermission` and `errorPages`.

```js
import { createNunjucksConfig } from '@defra/lis-infra-ui-services/nunjucks/plugin'

const nunjucksConfig = createNunjucksConfig({
  config, // reads root, assetPath, serviceName, isProduction, nunjucks.watch, nunjucks.noCache
  logger,
  moduleId: 'cattle-home' // spokes only
})

await server.register(nunjucksConfig)
```

The template components are `appHeading`, `appAutocomplete`, `lisDatePicker`, `lisSubNavigation`, plus the search form,
sortable paginated table and date templates. `createNunjucksContextBuilder` (also exported from
`/nunjucks-context`) builds just the view context. The filters `formatAge`, `formatDate`,
`formatEarTag`, `formatCurrency` and `queryString` are also exported from `/nunjucks/filters`, and the
individual `/nunjucks/format-currency`, `/nunjucks/format-date` and `/nunjucks/query-string`
subpaths. `/nunjucks/globals` exports `PERMISSIONS` and `govukRebrand` (always `true`, which turns
on the GOV.UK rebrand in templates).

### Asset path

A hub serves its built CSS and JavaScript at its configured `assetPath`. A spoke serves its own at
its `assets` mount from `@defra/lis-hubs-infra-registry` (`/assets/cattle-home`), which the hub
proxies to it unchanged, so the same URL works through a hub or directly.
`createAssetPathHelpers` resolves that root once; `getAssetPaths` feeds the static files plugin and
the Nunjucks context derives the same root itself from `moduleId`.

```js
import { createAssetPathHelpers } from '@defra/lis-infra-ui-services/asset-path'

const { getAssetPaths } = createAssetPathHelpers({
  moduleId: 'cattle-home', // leave out in a hub
  assetPath: config.get('assetPath')
})
```

The standalone `getAssetRoot` is exported too.

### Static files

```js
import { createStaticFilesPlugin } from '@defra/lis-infra-ui-services/static-files'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

const serveStaticFiles = createStaticFilesPlugin({
  assetPaths: getAssetPaths(),
  staticCacheTimeout: config.get('staticCacheTimeout'),
  noContentStatusCode: statusCodes.noContent
})
```

It serves `/favicon.ico` and the files under each asset path. `/status-codes` exports `statusCodes`.
`/duration` exports the `milliseconds` and `seconds` lookups and `unixEpoch()`.

### Config formats

`/config-formats` exports convict formats for settings the hubs and spokes share. Register each with `convict.addFormat()`; a bad value fails `config.validate()` with the setting named.

- `positiveInteger` (`'positive-integer'`): a whole number of at least 1, for timeouts, TTLs and circuit breaker thresholds, where 0 is a misconfiguration rather than "off". Values from environment variables are coerced from strings.
- `duration({ max })` (`'duration'`, or `'duration-max-P7D'` when `max` is given): a length of time read as milliseconds. An environment variable may give an ISO 8601 duration of days, hours, minutes and seconds (`PT4H`, `P7D`, `P1DT12H`) or a whole number of milliseconds; both are coerced to milliseconds (the schema `default` must be a number). `max` is itself an ISO 8601 duration and rejects anything longer, for `SESSION_CACHE_TTL` where CDP requires sessions to expire within 7 days.
- `cdpEnvironment` (`'cdp-environment'`): one of the CDP environments the platform injects as `ENVIRONMENT` (`infra-dev`, `management`, `dev`, `test`, `ext-test`, `perf-test`, `prod`), or `local` or `docker_compose` outside CDP. One list for every service, so a new environment is added here rather than in each repository's own enum; `ENVIRONMENTS` exports the list.
- `secret` (`'secret'`): a signing or encryption secret of at least 32 characters with no default, for `HUB_JWT_SECRET` and `SESSION_COOKIE_PASSWORD`. The setting must also be marked `sensitive: true`, or convict appends the value to the validation error.

```js
import convict from 'convict'
import {
  cdpEnvironment,
  duration,
  positiveInteger,
  secret
} from '@defra/lis-infra-ui-services/config-formats'
import { milliseconds } from '@defra/lis-infra-ui-services/duration'

const sessionTtl = duration({ max: 'P7D' })
convict.addFormat(cdpEnvironment)
convict.addFormat(positiveInteger)
convict.addFormat(sessionTtl)
convict.addFormat(secret)

environment: {
  format: 'cdp-environment',
  default: 'local',
  env: 'ENVIRONMENT'
},
sessionCacheTtl: {
  format: sessionTtl.name,
  default: milliseconds.fourHours,
  env: 'SESSION_CACHE_TTL'
},

timeout: {
  format: 'positive-integer',
  default: 5000,
  env: 'CATTLE_HOME_API_TIMEOUT'
},
hubJwtSecret: {
  format: 'secret',
  default: null,
  env: 'HUB_JWT_SECRET',
  sensitive: true
}
```

### Security headers

`securityHeaders` is a hapi plugin that adds HSTS, `x-content-type-options`, `referrer-policy` and
`permissions-policy` headers to every response, including error responses. Register it after
`catchAll`, so its `onPreResponse` runs last.

```js
import { securityHeaders } from '@defra/lis-infra-ui-services/security-headers'

await server.register(securityHeaders)
```

### Session cache

`getCacheEngine` picks Redis or in-memory Catbox. `createSessionCachePluginForConfig` registers
[yar](https://hapi.dev/module/yar/) from the `session` config (`cache.name`, `cache.ttl`,
`cookie.password`, `cookie.ttl`). Session cookies are always `Secure`, and `maxCookieSize` is `0` so session data always lives in the server cache, never the cookie, because the session carries the hub JWT. Both engines cap the ttl of
every write at `MAX_CACHE_TTL` (7 days), so no cache policy can keep session data longer than
CDP allows.

```js
import { getCacheEngine } from '@defra/lis-infra-ui-services/session-cache/cache-engine'
import { createSessionCachePluginForConfig } from '@defra/lis-infra-ui-services/session-cache'

const server = hapi.server({
  cache: [
    {
      name: config.get('session.cache.name'),
      engine: getCacheEngine({
        engine: config.get('session.cache.engine'), // 'redis' or anything else for memory
        config, // reads redis when the engine is 'redis'
        logger
      })
    }
  ]
})

await server.register(createSessionCachePluginForConfig(config))
```

`/redis-client` exports `buildRedisClient`, which `getCacheEngine` uses. It takes the `redis` config
(`host`, `port`, `keyPrefix`, `username`, `password`, `useTLS`, `useSingleInstanceCache`).

### Outbound proxy

`setupProxy` sends `fetch` and other HTTP clients through the proxy when `proxyUrl` is set. It does
nothing when it is empty.

```js
import { setupProxy } from '@defra/lis-infra-ui-services/proxy/setup-proxy'

setupProxy({ proxyUrl: config.get('httpProxy'), logger })
```

### Referrer link

`createReferrerLink` remembers where a user came from, so a page reached from a list can link back to
that list with its query. Use `getSameHostReferrerPath` to read the referrer.

```js
import { createReferrerLink } from '@defra/lis-infra-ui-services/referrer-link'

const referrerLink = createReferrerLink(server, {
  cacheName: 'session',
  allow: (path) => path.startsWith('/cphs'),
  fallbackHref: '/cphs'
})

const back = await referrerLink.resolve(request) // { id, href } or null
const href = referrerLink.link('/cphs/12/34/5678', back?.id ?? null)
```

### Microsite paths

The main entry point (`@defra/lis-infra-ui-services`) exports `buildMicrositePath(taxonomy, species)`, which returns `/<species>/<taxonomy>`.

### Error pages

`catchAll` from `@defra/lis-infra-ui-services/errors`, registered as an `onPreResponse` extension, renders one of four shared pages from `src/nunjucks/routes/error/` by status code:

| Status        | Page                   |
| ------------- | ---------------------- |
| 404           | `page-not-found`       |
| 401, 403      | `not-authorised`       |
| anything else | `problem-with-service` |

A 503 from a dependency (a service token that cannot be issued, an open circuit) is a problem with the service, not maintenance. The `service-unavailable` page is only rendered by the maintenance plugin below, which knows when the service is back.

5xx responses are logged at `error`, and 4xx responses other than 401, 403 and 404 at `warn`, each with the error object and the ECS fields `http.request.method`, `url.path` and `http.response.status_code`. Boom messages are logged, so application code must not put user-supplied text in them.

```js
import { catchAll } from '@defra/lis-infra-ui-services/errors'

server.ext('onPreResponse', catchAll)
```

The contact link on these pages comes from the `errorPages` option of `createNunjucksConfig` (or `createNunjucksContextBuilder`), exposed to templates as `errorPages`. The key is optional:

```js
createNunjucksConfig({
  config,
  logger,
  errorPages: {
    contactHref:
      'https://www.gov.uk/government/organisations/british-cattle-movement-service' // default
  }
})
```

### Layout scripts

`layoutComponents` from `@defra/lis-infra-ui-services/components/layout` is the list of GOV.UK Frontend components the layout template renders: Service navigation and Skip link.

`errorPageComponents` from `@defra/lis-infra-ui-services/components/error-pages` is the list the shared error pages render (Button, for the not-authorised sign-in button). Every app that serves the shared error pages must add it.

Start each with `createAll`, alongside any page-level components (see the full example under [Scrollable table](#scrollable-table)).

Wrap the combined list in a `Set`, so a component that appears in more than one list (or that the app also lists itself) is only initialised once: govuk's base class logs an InitError on double init.

#### Scrollable table

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

#### Autocomplete

For the `appAutocomplete` template component, start the script with `initAllAutocompletes`. It enhances each input with [accessible-autocomplete](https://github.com/alphagov/accessible-autocomplete).

```js
import { initAllAutocompletes } from '@defra/lis-infra-ui-services/components/autocomplete'

initAllAutocompletes()
```

#### Date picker

The `lisDatePicker` template component adds a calendar dialog to a GOV.UK text input, adapted from the [MoJ Frontend date picker](https://design-patterns.service.justice.gov.uk/components/date-picker) (MIT licence, see [LICENCE-moj-frontend.txt](./LICENCE-moj-frontend.txt)). It takes the same `id`, `name`, `value`, `label`, `hint`, `errorMessage`, `formGroup`, `classes` and `attributes` as `govukInput`, plus `minDate` and `maxDate` (`d/m/yyyy`), `excludedDates`, `excludedDays` (day names separated by spaces), `leadingZeros` (picked dates are `27/3/2026` by default, `27/03/2026` when `true`) and `weekStartDay` (`monday` or `sunday`, default `monday`).

`excludedDates` takes dates and ranges separated by spaces, for example `"1/6/2026 10/6/2026-12/6/2026"`. A hyphen always marks a range, so dates there must use `/` (or `.` or `,`) between their parts, never `-`. Anything that is not a real date, such as `31/4/2026` or `1-6-2026`, is ignored.

```njk
{% from "date-picker/macro.njk" import lisDatePicker %}

{{ lisDatePicker({
  id: "movement-date",
  name: "movementDate",
  label: { text: "Date of movement" },
  hint: { text: "For example, 27/3/2026" },
  maxDate: "5/11/2026"
}) }}
```

Start `DatePicker` from `@defra/lis-infra-ui-services/components/date-picker` with `createAll`, alongside the other components. Without JavaScript the plain text input remains.

```js
import { createAll } from 'govuk-frontend'
import { DatePicker } from '@defra/lis-infra-ui-services/components/date-picker'

createAll(DatePicker)
```

#### Form

The `lisForm` template component renders a `novalidate` form with the CSRF token in a hidden `_csrf` field (see [CSRF protection](#csrf-protection)) around the caller's body. It takes `action` (left out when not given, so the form posts to the page itself), `method` (default `post`), `classes` and `attributes`. Import it `with context` so it reads `csrfToken` from the page, or pass `csrfToken` yourself. A `GET` form gets no token field, which would otherwise end up in the URL.

```njk
{% from "form/macro.njk" import lisForm with context %}

{% call lisForm({ action: "/holdings/12/345/6789/edit", classes: "lis-edit-form" }) %}
  {{ govukInput({ id: "nickname", name: "nickname", label: { text: "Nickname" } }) }}
  {{ govukButton({ text: "Save" }) }}
{% endcall %}
```

### Styles

Import the Sass files you need from your app's stylesheet: `components/autocomplete.scss`,
`components/date-picker.scss`, `components/search-form.scss`, `components/service-navigation.scss`,
`components/sortable-paginated-table.scss` and `components/sub-navigation.scss`.

```scss
@use 'pkg:@defra/lis-infra-ui-services/components/service-navigation.scss';
```

### Scheduled maintenance

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

### Cookies

The base layout shows the GOV.UK cookie banner until the visitor has made a choice, and its footer links to a cookies page at `/cookies`. The choice is kept for a year in a `cookies_policy` cookie (URL-encoded JSON, readable by client-side scripts so analytics can check it before loading), set by the banner's JavaScript or, without JavaScript, by posting the banner's form to `/cookies`. Each hub registers the page with the essential cookies it sets, which the page lists:

```js
// server.js, after @hapi/vision is registered
import { createCookiesPlugin } from '@defra/lis-infra-ui-services/cookies'

await server.register(
  createCookiesPlugin({
    essentialCookies: [
      {
        name: config.get('session.cache.name'),
        purpose: 'Keeps you signed in as you move between pages',
        expires: 'After 4 hours, or when you sign out'
      }
    ]
  })
)
```

`GET /cookies` shows the page, with a form to change the choice. `POST /cookies` records a choice (`analytics=yes|no`), ignoring any post that is not same-origin (it opts out of the CSRF plugin, as a signed-out visitor has no token), and redirects to the page with a confirmation and a link back to the same-host page the visitor came from. The `CookieBanner` component is part of `layoutComponents` (see [Layout scripts](#layout-scripts)), so a hub that already initialises those needs no further client-side change. `getCookiesPolicy(request)` from `@defra/lis-infra-ui-services/cookies/cookies-policy` reads the recorded choice server-side.

### CSRF protection

`csrfPlugin` from `@defra/lis-infra-ui-services/csrf` refuses, with a 403 and a warning log naming the failed check, every request other than `GET`, `HEAD` and `OPTIONS` that is not same-origin or does not carry the token. Register it after authentication and, on a hub, after the session:

```js
import { csrfPlugin } from '@defra/lis-infra-ui-services/csrf'

// hub: the token lives in the yar session, issued once the user is signed in
await server.register({
  plugin: csrfPlugin,
  options: { tokenSource: 'session' }
})

// spoke: the token comes from the hub in the x-lis-csrf-token header (CSRF_TOKEN_HEADER)
await server.register({
  plugin: csrfPlugin,
  options: { tokenSource: 'header' }
})
```

- **Origin check**: `Sec-Fetch-Site` must be `same-origin` (`same-site`, `cross-site` and `none` fail, as other tenants share the platform domain). Without it, the `Origin` host must match the host the browser addressed (`x-forwarded-host`, then `host`). A request with neither fails. `isSameOriginRequest(request)` exposes the check.
- **Token check**: the `_csrf` field (`CSRF_FIELD_NAME`) of a parsed form or JSON body must match the request's token, compared in constant time. A streamed or raw body fails. The field is removed from `request.payload` before route validation, so schemas need not allow it.
- The token is published at `request.plugins['lis-csrf'].token` and given to every view as `csrfToken`. `clearCsrfToken(request)` drops it from the session, so the next signed-in request gets a new one.

A route opts out through `options.plugins['lis-csrf']`: `false` or `{ enabled: false }` skips every check; `{ token: false }` keeps only the origin check, for a proxied (streamed) body or a form a signed-out visitor submits.

A route can answer a failed check itself with `options.plugins['lis-csrf'] = { failAction: (request, h) => h.redirect('/') }`: the warning is still logged, then the plugin takes over with what `failAction` returns (a response or an error) in place of the 403. Returning `h.continue` still gets a 403, so a failed request never reaches the handler. Hub sign-out uses it to send an expired or forged sign-out home.

The token is kept in the hub session under `lis-csrf-token` (`CSRF_SESSION_KEY`), which `@defra/lis-hubs-infra-access` clears at sign-in. A hub proxy sends it to spokes in `x-lis-csrf-token` and leaves the token check to the spoke.

The base layout's header Sign out and the `error/not-authorised` view's Sign out (given a `signOutHref`) are links to `/signout`. A hub answers that `GET` with the `auth/sign-out` view, which asks the user to confirm: an `Are you sure you want to sign out?` heading, a `Sign out` button in a form posting the token to `signOutHref`, and a `Cancel` link to `/`. Pass `pageTitle` and `signOutHref`; render it only when there is a `csrfToken`.

### Environment variables

The package reads no environment variables itself. It takes all its settings from the `config` object the consuming app passes in. In the example above, `MAINTENANCE_AVAILABLE_FROM` is a variable the hub defines in its own config.

## Prerequisites

- Node.js 24 (see `.nvmrc`, use `nvm use`)
- To check changes against a consuming app: a local clone of [lis-dev](https://github.com/DEFRA/lis-dev) with its one-time setup done

## Setup

### Development

```bash
nvm use
npm install
```

### Test

There are no tools to install beyond `npm install`. Tests use [Vitest](https://vitest.dev/).

## Running in development

This is a library, so it has no server of its own. To try a change in a consuming app without
publishing, link the local copy into the lis-dev stack:

```bash
cd lis-dev
.bin/sideload link infra/ui-services # every installed copy now points at this repo
.bin/sideload up front-office       # optional: run the consumer locally with hot reload
.bin/sideload unlink infra/ui-services # when done
```

## Running tests

```bash
npm test                 # unit tests
npm run test:coverage    # with coverage
npm run lint             # ESLint
npm run format:check     # Prettier
```

Before releasing a change, also run the tests of each consuming repo against the linked package.

## Pipelines

Build, versioning and publishing run in GitHub Actions (`.github/workflows`) using Cake scripts (`*.cake`):

- **Pull request to `main`**: validate (format, lint, test), Sonar analysis, version check
- **Push to a `feature/` or `hotfix/` branch**: prerelease version and tag
- **Merge to `main`**: release tag, then publish to [npm](https://www.npmjs.com/package/@defra/lis-infra-ui-services)

Versions come from git tags (SemVer). After a merge, wait for the publish job to finish before bumping the package in consuming repos.

## Branching policy

The repo uses mainline development. Branch from `main` and name the branch:

- `feature/LREG-<ticket>-<short-kebab-description>`
- `hotfix/LREG-<ticket>-<short-kebab-description>`

`LREG` must be uppercase, because the GitHub ruleset rejects other branch names. Rebase onto `main`
rather than merging `main` in.

## Contributing to this project

- Follow the [Defra software development standards](https://github.com/DEFRA/software-development-standards).
- `npm install` sets up a pre-commit hook (Husky) that runs the security audit, format check and lint.
- Open a pull request against `main` using the PR template. CI must pass and the Sonar quality gate must be green before merge.
- Feature branches bump the minor version and hotfix branches the patch version. While the package is on 0.x, a breaking change to the public API ships as a minor version, so call it out in the PR so consumers can update.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of His Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
