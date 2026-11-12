import Joi from 'joi'
import { describe, expect, test } from 'vitest'

import { createJourney } from './index.js'

const nameStep = {
  page: 'name',
  schema: Joi.object({
    name: Joi.string()
      .required()
      .valid(Joi.in('$allowedNames'))
      .messages({ 'any.required': 'required', 'any.only': 'notAllowed' })
  }),
  context: ({ allowedNames }, saved) => ({
    allowedNames: [...allowedNames, saved.name]
  })
}
const ageStep = {
  page: 'age',
  schema: Joi.object({
    age: Joi.string().required().messages({ 'any.required': 'required' })
  })
}
const nicknameStep = {
  page: 'nickname',
  schema: Joi.object({
    nickname: Joi.string().required().messages({ 'any.required': 'required' })
  }),
  appliesTo: (record) => record.name === 'Daisy'
}
const renamingStep = { ...nameStep, clearsOnChange: ['nickname'] }
const OPTIONS = { allowedNames: ['Daisy'] }

describe('createJourney()', () => {
  test("it validates a page's answers with the step's rules", () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.validateStep(
      'name',
      {},
      { name: 'Buttercup' },
      OPTIONS
    )

    // Assert
    expect(result).toEqual({
      errors: [{ field: 'name', code: 'notAllowed' }],
      warnings: []
    })
  })

  test('it gives the step the record as it is saved for its context', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])
    const saved = { name: 'Buttercup' }

    // Act
    const result = journey.validateStep(
      'name',
      saved,
      { name: 'Buttercup' },
      OPTIONS
    )

    // Assert
    expect(result).toEqual({ errors: [], warnings: [] })
  })

  test('it finds the first step in order that is incomplete', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.firstIncompleteStep({ name: 'Daisy' }, OPTIONS)

    // Assert
    expect(result).toBe(ageStep)
  })

  test("it replaces only the page's own answers on the record", () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])
    const saved = { name: 'Daisy', age: '2' }

    // Act
    const result = journey.withAnswers('age', saved, {
      age: '3',
      name: 'Other'
    })

    // Assert
    expect(result).toEqual({ name: 'Daisy', age: '3' })
  })

  test('it owes the page of the first earlier step with an answer missing', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.pageOwed('age', {})

    // Assert
    expect(result).toBe('name')
  })

  test('it owes nothing when the earlier steps are answered', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.pageOwed('age', { name: 'Daisy' })

    // Assert
    expect(result).toBeUndefined()
  })

  test('it owes nothing for the first step', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.pageOwed('name', {})

    // Assert
    expect(result).toBeUndefined()
  })

  test('it passes over a step the record does not go through', () => {
    // Arrange
    const journey = createJourney([nameStep, nicknameStep, ageStep])

    // Act
    const result = journey.firstIncompleteStep(
      { name: 'Buttercup' },
      { allowedNames: ['Buttercup'] }
    )

    // Assert
    expect(result).toBe(ageStep)
  })

  test('it owes the last step the record goes through for a page it does not', () => {
    // Arrange
    const journey = createJourney([nameStep, nicknameStep, ageStep])

    // Act
    const result = journey.pageOwed('nickname', { name: 'Buttercup' })

    // Assert
    expect(result).toBe('name')
  })

  test('it removes the answers a changed answer invalidates', () => {
    // Arrange
    const journey = createJourney([renamingStep, nicknameStep])
    const saved = { name: 'Daisy', nickname: 'Dee' }

    // Act
    const result = journey.withAnswers('name', saved, { name: 'Buttercup' })

    // Assert
    expect(result).toEqual({ name: 'Buttercup' })
  })

  test('it keeps those answers when the answer is the same', () => {
    // Arrange
    const journey = createJourney([renamingStep, nicknameStep])
    const saved = { name: 'Daisy', nickname: 'Dee' }

    // Act
    const result = journey.withAnswers('name', saved, { name: 'Daisy' })

    // Assert
    expect(result).toEqual({ name: 'Daisy', nickname: 'Dee' })
  })

  test('it gives the step the record went through before a page', () => {
    // Arrange
    const journey = createJourney([nameStep, nicknameStep, ageStep])

    // Act
    const result = journey.previousPage('age', { name: 'Buttercup' })

    // Assert
    expect(result).toBe('name')
  })

  test('it gives no step before the first', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.previousPage('name', {})

    // Assert
    expect(result).toBeUndefined()
  })

  test('it gives the step the record goes through after a page, passing over one it does not', () => {
    // Arrange
    const journey = createJourney([nameStep, nicknameStep, ageStep])

    // Act
    const result = journey.nextPage('name', { name: 'Buttercup' })

    // Assert
    expect(result).toBe('age')
  })

  test('it gives no step after the last', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.nextPage('age', { name: 'Daisy', age: '3' })

    // Assert
    expect(result).toBeUndefined()
  })

  test('it finds the first step the record goes through with an answer yet to be saved', () => {
    // Arrange
    const journey = createJourney([nameStep, nicknameStep, ageStep])

    // Act
    const result = journey.firstUnansweredPage({ name: 'Buttercup' })

    // Assert
    expect(result).toBe('age')
  })

  test('it finds no unanswered step once every step is saved', () => {
    // Arrange
    const journey = createJourney([nameStep, nicknameStep, ageStep])

    // Act
    const result = journey.firstUnansweredPage({
      name: 'Buttercup',
      age: '3'
    })

    // Assert
    expect(result).toBeUndefined()
  })

  test('it refuses a page that is not one of its steps', () => {
    // Arrange
    const journey = createJourney([nameStep])

    // Act
    let thrown
    try {
      journey.validateStep('age', {}, { age: '3' }, OPTIONS)
    } catch (error) {
      thrown = error
    }

    // Assert
    expect(thrown.message).toBe('No step for page "age"')
  })

  test("it validates a page whose step's rules need no options", () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])

    // Act
    const result = journey.validateStep('age', { name: 'Daisy' }, {})

    // Assert
    expect(result).toEqual({
      errors: [{ field: 'age', code: 'required' }],
      warnings: []
    })
  })

  test("it gives every error of a page's answers in the order of its rules", () => {
    // Arrange
    const addressStep = {
      page: 'address',
      schema: Joi.object({
        street: Joi.string()
          .required()
          .messages({ 'any.required': 'noStreet' }),
        town: Joi.string().required().messages({ 'any.required': 'noTown' })
      })
    }
    const journey = createJourney([addressStep])

    // Act
    const result = journey.validateStep('address', {}, {})

    // Assert
    expect(result.errors).toEqual([
      { field: 'street', code: 'noStreet' },
      { field: 'town', code: 'noTown' }
    ])
  })

  test('it gives what a rule only warns of as a warning', () => {
    // Arrange
    const weightStep = {
      page: 'weight',
      schema: Joi.object({
        weight: Joi.string()
          .required()
          .warning('weight.unusual', {})
          .messages({ 'weight.unusual': 'unusual' })
      })
    }
    const journey = createJourney([weightStep])

    // Act
    const result = journey.validateStep('weight', {}, { weight: '900' })

    // Assert
    expect(result).toEqual({
      errors: [],
      warnings: [{ field: 'weight', code: 'unusual' }]
    })
  })

  test('it finds no incomplete step for a record that is complete', () => {
    // Arrange
    const journey = createJourney([nameStep, ageStep])
    const record = { name: 'Daisy', age: '3' }

    // Act
    const result = journey.firstIncompleteStep(record, OPTIONS)

    // Assert
    expect(result).toBeUndefined()
  })

  test('it finds the first incomplete step without options when no rule needs them', () => {
    // Arrange
    const journey = createJourney([ageStep])

    // Act
    const result = journey.firstIncompleteStep({})

    // Assert
    expect(result).toBe(ageStep)
  })

  test('it counts a step that owns no answers as answered', () => {
    // Arrange
    const confirmStep = { page: 'confirm', schema: Joi.object() }
    const journey = createJourney([confirmStep, ageStep])

    // Act
    const result = journey.firstUnansweredPage({})

    // Assert
    expect(result).toBe('age')
  })

  test('it counts a step as answered when only an optional answer is absent', () => {
    // Arrange
    const petStep = {
      page: 'pet',
      schema: Joi.object({
        pet: Joi.string().required(),
        petName: Joi.string().optional()
      })
    }
    const journey = createJourney([petStep, ageStep])

    // Act
    const result = journey.firstUnansweredPage({ pet: 'dog' })

    // Assert
    expect(result).toBe('age')
  })

  test('it counts a step as unanswered when a required answer is absent', () => {
    // Arrange
    const petStep = {
      page: 'pet',
      schema: Joi.object({
        pet: Joi.string().required(),
        petName: Joi.string().optional()
      })
    }
    const journey = createJourney([petStep, ageStep])

    // Act
    const result = journey.firstUnansweredPage({ petName: 'Rex' })

    // Assert
    expect(result).toBe('pet')
  })

  test('it counts a required answer saved blank as answered', () => {
    // Arrange
    const notesStep = {
      page: 'notes',
      schema: Joi.object({ notes: Joi.string().allow('').required() })
    }
    const journey = createJourney([notesStep, ageStep])

    // Act
    const result = journey.pageOwed('age', { notes: '' })

    // Assert
    expect(result).toBeUndefined()
  })

  test('it counts a required answer saved as null as answered', () => {
    // Arrange
    const notesStep = {
      page: 'notes',
      schema: Joi.object({ notes: Joi.string().allow(null).required() })
    }
    const journey = createJourney([notesStep, ageStep])

    // Act
    const result = journey.pageOwed('age', { notes: null })

    // Assert
    expect(result).toBeUndefined()
  })

  test('it saves an answer given as null as null', () => {
    // Arrange
    const notesStep = {
      page: 'notes',
      schema: Joi.object({ notes: Joi.string().allow(null).required() })
    }
    const journey = createJourney([notesStep])

    // Act
    const result = journey.withAnswers('notes', {}, { notes: null })

    // Assert
    expect(result).toEqual({ notes: null })
  })

  test('it saves a record unchanged for a step that owns no answers', () => {
    // Arrange
    const confirmStep = { page: 'confirm', schema: Joi.object() }
    const journey = createJourney([ageStep, confirmStep])

    // Act
    const result = journey.withAnswers('confirm', { age: '3' }, {})

    // Assert
    expect(result).toEqual({ age: '3' })
  })
})
