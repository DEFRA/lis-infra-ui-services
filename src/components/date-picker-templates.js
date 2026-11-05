// Adapted from the date picker in MoJ Frontend 12.0.0
// (https://github.com/ministryofjustice/moj-frontend), MIT licence.
// Copyright (c) 2019 Ministry of Justice

/**
 * HTML for the button that opens the calendar dialog. It gets aria-controls
 * when the dialog is first built.
 * @returns {string} the toggle button markup
 */
export function toggleTemplate() {
  return `<button class="lis-date-picker__toggle lis-js-date-picker-toggle" type="button" aria-haspopup="dialog" aria-expanded="false">
          <span class="govuk-visually-hidden">Choose date</span>
          <svg width="32" height="24" focusable="false" class="lis-date-picker-icon" aria-hidden="true" role="img" viewBox="0 0 22 22">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M16.1333 2.93333H5.86668V4.4C5.86668 5.21002 5.21003 5.86667 4.40002 5.86667C3.59 5.86667 2.93335 5.21002 2.93335 4.4V2.93333H2C0.895431 2.93333 0 3.82877 0 4.93334V19.2667C0 20.3712 0.89543 21.2667 2 21.2667H20C21.1046 21.2667 22 20.3712 22 19.2667V4.93333C22 3.82876 21.1046 2.93333 20 2.93333H19.0667V4.4C19.0667 5.21002 18.41 5.86667 17.6 5.86667C16.79 5.86667 16.1333 5.21002 16.1333 4.4V2.93333ZM20.5333 8.06667H1.46665V18.8C1.46665 19.3523 1.91436 19.8 2.46665 19.8H19.5333C20.0856 19.8 20.5333 19.3523 20.5333 18.8V8.06667Z"
            ></path>
            <rect x="3.66669" width="1.46667" height="5.13333" rx="0.733333" fill="currentColor"></rect>
            <rect x="16.8667" width="1.46667" height="5.13333" rx="0.733333" fill="currentColor"></rect>
          </svg>
        </button>`
}

/**
 * HTML for one of the dialog's month and year navigation buttons.
 * @param {string} jsClass - the button's JavaScript hook class
 * @param {string} label - the button's accessible name
 * @param {string[]} arrowPaths - path data for the one or two chevrons
 * @returns {string} the button markup
 */
function navigationButton(jsClass, label, arrowPaths) {
  const paths = arrowPaths
    .map(
      (pathData) =>
        `<path fill-rule="evenodd" clip-rule="evenodd" d="${pathData}" fill="currentColor"/>`
    )
    .join('')

  return `<button type="button" class="lis-date-picker__button ${jsClass}">
            <span class="govuk-visually-hidden">${label}</span>
            <svg width="44" height="40" viewBox="0 0 44 40" fill="none" focusable="false" aria-hidden="true" role="img">${paths}</svg>
          </button>`
}

/**
 * HTML for the calendar dialog's header, grid and buttons.
 * @param {string} titleId - id attribute for the dialog title
 * @returns {string} the dialog markup
 */
export function dialogTemplate(titleId) {
  return `<div class="lis-date-picker__dialog-header">
          <div class="lis-date-picker__dialog-navbuttons">
            ${navigationButton(
              'lis-js-date-picker-prev-year',
              'Previous year',
              [
                'M23.1643 20L28.9572 14.2071L27.5429 12.7929L20.3358 20L27.5429 27.2071L28.9572 25.7929L23.1643 20Z',
                'M17.1643 20L22.9572 14.2071L21.5429 12.7929L14.3358 20L21.5429 27.2071L22.9572 25.7929L17.1643 20Z'
              ]
            )}
            ${navigationButton(
              'lis-js-date-picker-prev-month',
              'Previous month',
              [
                'M20.5729 20L25.7865 14.2071L24.5137 12.7929L18.0273 20L24.5137 27.2071L25.7865 25.7929L20.5729 20Z'
              ]
            )}
          </div>

          <h2 id="${titleId}" class="lis-date-picker__dialog-title lis-js-date-picker-month-year" aria-live="polite">June 2020</h2>

          <div class="lis-date-picker__dialog-navbuttons">
            ${navigationButton('lis-js-date-picker-next-month', 'Next month', [
              'M23.4271 20L18.2135 14.2071L19.4863 12.7929L25.9727 20L19.4863 27.2071L18.2135 25.7929L23.4271 20Z'
            ])}
            ${navigationButton('lis-js-date-picker-next-year', 'Next year', [
              'M20.8357 20L15.0428 14.2071L16.4571 12.7929L23.6642 20L16.4571 27.2071L15.0428 25.7929L20.8357 20Z',
              'M26.8357 20L21.0428 14.2071L22.4571 12.7929L29.6642 20L22.4571 27.2071L21.0428 25.7929L26.8357 20Z'
            ])}
          </div>
        </div>

        <table class="lis-date-picker__calendar lis-js-date-picker-grid" role="application" aria-labelledby="${titleId}">
          <thead>
            <tr></tr>
          </thead>

          <tbody></tbody>
        </table>

        <div class="govuk-button-group">
          <button type="button" class="govuk-button lis-js-date-picker-ok">Select</button>
          <button type="button" class="govuk-button govuk-button--secondary lis-js-date-picker-cancel">Close</button>
        </div>`
}
