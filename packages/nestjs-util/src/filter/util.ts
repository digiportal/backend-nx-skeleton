import { BadRequestException, ValidationError } from '@nestjs/common'

import { ClassValidatorException, ClassValidatorError } from './exception.interface'

export function getErrorMessage (message: any): string | undefined {
  return typeof message === 'string' ? message : typeof message.message === 'string' ? message.message : undefined
}

function hasAllKeys (message: Record<string, any>, keys: string[]): boolean {
  return keys.every((key) => Object.keys(message).includes(key))
}

export function isValidationError (exception: BadRequestException): exception is ClassValidatorException {
  if (!exception.hasOwnProperty('validation')) {
    return false
  }

  const validatorException = exception as ClassValidatorException

  // note: 'constraints' is only included on leaves of tree
  const keys: (keyof ValidationError)[] = [ 'target', 'value', 'property', 'children' ]

  const messages = validatorException.validation

  return messages.every((message) => hasAllKeys(message, keys))
}

// recursively flatten and format nested ValidationError
export function formatValidationError (errors: ValidationError[]): ClassValidatorError[] {
  const flattened: ClassValidatorError[] = []

  for (const { children, property, constraints } of errors) {
    if (Array.isArray(children) && children.length > 0) {
      flattened.push(...formatValidationError(children))
    } else if (property && constraints) {
      flattened.push({
        property,
        constraints: Object.keys(constraints),
        messages: Object.values(constraints)
      })
    }
  }

  return flattened
}
