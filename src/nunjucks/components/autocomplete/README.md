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
import { initAllAutocompletes } from '@defra/lis-infra-ui-services/components/autocomplete'
import '@defra/lis-infra-ui-services/components/autocomplete.scss'

initAllAutocompletes()
```

All standard GOV.UK input options are passed unchanged to `govukInput`.
Additional options are:

- `items` (required): strings, or objects with a `text` property. Give
  every item a `value` as well to submit that value in place of the text:
  see "Items with values"
- `autoselect`: highlight the first matching result
- `confirmOnBlur`: confirm the highlighted result on blur; defaults to `true`
- `displayMenu`: `inline` (default) or `overlay`
- `minLength`: characters required before showing results; defaults to `0`
- `showAllValues`: show all results when the input is selected
- `containerClasses`: classes for the outer enhancement container

## Items with values

When the items have values, the field submits the chosen item's `value` and
shows its `text`:

```njk
{{ appAutocomplete({
  label: { text: "Breed" },
  id: "breed",
  name: "breed",
  value: data.breed,
  items: [
    { value: "AA", text: "Aberdeen Angus (AA)" },
    { value: "HE", text: "Hereford (HE)" }
  ]
}) }}
```

`value` is then the value of the item to show as chosen. The component renders
a GOV.UK select, which is the no-JavaScript control, and the client module
enhances it. Text that is not one item's text, ignoring case, submits an empty
value, so the server can treat anything but a listed item as not answered.
That text is not shown again when the page is re-rendered with an error.

Every item needs a string `value` and a `text` that no other item shares.

In this form `label`, `hint`, `errorMessage`, `formGroup`, `describedBy` and
`disabled` are passed to `govukSelect`, `classes` are applied to the enhanced input, and
the other GOV.UK input options are not used.
