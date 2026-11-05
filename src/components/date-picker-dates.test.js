import { describe, expect, test } from 'vitest'

import {
  formatDate,
  parseDate,
  parseDateRange,
  parseExcludedDates,
  parseExcludedDays
} from './date-picker-dates.js'

const FALLBACK = new Date(2000, 0, 1)

describe('date-picker-dates', () => {
  describe('parseDate()', () => {
    test.each([
      ['27/3/2026', new Date(2026, 2, 27)],
      ['07/03/2026', new Date(2026, 2, 7)],
      ['27-3-2026', new Date(2026, 2, 27)],
      ['27.3.2026', new Date(2026, 2, 27)],
      ['27,3,2026', new Date(2026, 2, 27)],
      ['27 3 2026', new Date(2026, 2, 27)],
      ['  27/3/2026  ', new Date(2026, 2, 27)],
      ['29/2/2024', new Date(2024, 1, 29)]
    ])('reads %j as a date', (dateString, expected) => {
      // Act
      const result = parseDate(dateString, FALLBACK)

      // Assert
      expect(result).toStrictEqual(expected)
    })

    test.each([
      '31/2/2026',
      '29/2/2026',
      '31/4/2026',
      '45/13/2026',
      '0/1/2026',
      '1/0/2026'
    ])('rejects the impossible date %j', (dateString) => {
      // Act
      const result = parseDate(dateString, FALLBACK)

      // Assert
      expect(result).toBe(FALLBACK)
    })

    test.each([
      '127/3/20261',
      '27/3/20261',
      '27/3/26',
      'on 27/3/2026',
      '27/3/2026 or later',
      '27/3-2026',
      '',
      'soon'
    ])('rejects %j, which is not just a date', (dateString) => {
      // Act
      const result = parseDate(dateString, FALLBACK)

      // Assert
      expect(result).toBe(FALLBACK)
    })

    test('returns a null fallback when asked', () => {
      // Act
      const result = parseDate('31/4/2026', null)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('parseDateRange()', () => {
    test('returns every date from the start to the end', () => {
      // Act
      const result = parseDateRange('30/4/2026-2/5/2026')

      // Assert
      expect(result).toStrictEqual([
        new Date(2026, 3, 30),
        new Date(2026, 4, 1),
        new Date(2026, 4, 2)
      ])
    })

    test('returns no dates when the end is before the start', () => {
      // Act
      const result = parseDateRange('2/5/2026-30/4/2026')

      // Assert
      expect(result).toStrictEqual([])
    })

    test.each(['1/5/2026-31/4/2026', '1/5/2026-soon', '1-5-2026'])(
      'returns no dates for %j',
      (rangeString) => {
        // Act
        const result = parseDateRange(rangeString)

        // Assert
        expect(result).toStrictEqual([])
      }
    )
  })

  describe('parseExcludedDates()', () => {
    test.each([
      ['a trailing space', '1/6/2026 ', [new Date(2026, 5, 1)]],
      [
        'leading and repeated spaces',
        '  1/6/2026   3/6/2026',
        [new Date(2026, 5, 1), new Date(2026, 5, 3)]
      ],
      [
        'newlines and tabs',
        '1/6/2026\n\t3/6/2026\n',
        [new Date(2026, 5, 1), new Date(2026, 5, 3)]
      ],
      [
        'an invalid token',
        '1/6/2026 soon 3/6/2026',
        [new Date(2026, 5, 1), new Date(2026, 5, 3)]
      ],
      [
        'an impossible date',
        '1/6/2026 31/6/2026 3/6/2026',
        [new Date(2026, 5, 1), new Date(2026, 5, 3)]
      ],
      [
        'a date with hyphens between its parts',
        '1/6/2026 2-6-2026 3/6/2026',
        [new Date(2026, 5, 1), new Date(2026, 5, 3)]
      ]
    ])('keeps only the real dates with %s', (_, excludedDates, expected) => {
      // Act
      const result = parseExcludedDates(excludedDates)

      // Assert
      expect(result).toStrictEqual(expected)
    })

    test('combines single dates and ranges', () => {
      // Act
      const result = parseExcludedDates('1/6/2026 10/6/2026-12/6/2026')

      // Assert
      expect(result).toStrictEqual([
        new Date(2026, 5, 1),
        new Date(2026, 5, 10),
        new Date(2026, 5, 11),
        new Date(2026, 5, 12)
      ])
    })

    test.each(['', '   ', 'soon'])(
      'returns no dates for %j',
      (excludedDates) => {
        // Act
        const result = parseExcludedDates(excludedDates)

        // Assert
        expect(result).toStrictEqual([])
      }
    )
  })

  describe('parseExcludedDays()', () => {
    test('reads day names in any case and spacing as Date.getDay() indexes', () => {
      // Act
      const result = parseExcludedDays(' Saturday \n sunday  MONDAY ')

      // Assert
      expect(result).toStrictEqual([6, 0, 1])
    })

    test('drops words that are not day names', () => {
      // Act
      const result = parseExcludedDays('sunday someday sat')

      // Assert
      expect(result).toStrictEqual([0])
    })
  })

  describe('formatDate()', () => {
    test.each([
      [false, '7/3/2026'],
      [true, '07/03/2026']
    ])('with leading zeros %s formats as %s', (leadingZeros, expected) => {
      // Act
      const result = formatDate(new Date(2026, 2, 7), leadingZeros)

      // Assert
      expect(result).toBe(expected)
    })
  })
})
