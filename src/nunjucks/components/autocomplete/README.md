# Autocomplete

`appAutocomplete` uses the GOV.UK input Nunjucks macro for its label, hint,
error message and no-JavaScript control. The client module progressively
enhances that input with GDS's `accessible-autocomplete` component.

```njk
{{ appAutocomplete({
  label: {
    text: "Choose a livestock species",
    classes: "govuk-label--l",
    isPageHeading: true
  },
  hint: {
    text: "Start typing a species name"
  },
  id: "species",
  name: "species",
  value: data.species,
  errorMessage: errors.species,
  items: ["Cattle", "Goats", "Pigs", "Sheep"],
  minLength: 2
}) }}
```

Import and initialise the client module from the consuming application's entry
point, and include its stylesheet:

```js
import { initAllAutocompletes } from '@livestock/ui-services/components/autocomplete'
import '@livestock/ui-services/components/autocomplete.css'

initAllAutocompletes()
```

All standard GOV.UK input options are passed unchanged to `govukInput`.
Additional options are:

- `items` (required): strings, or objects with a `text` property
- `autoselect`: highlight the first matching result
- `confirmOnBlur`: confirm the highlighted result on blur; defaults to `true`
- `displayMenu`: `inline` (default) or `overlay`
- `minLength`: characters required before showing results; defaults to `0`
- `showAllValues`: show all results when the input is selected
- `containerClasses`: classes for the outer enhancement container
