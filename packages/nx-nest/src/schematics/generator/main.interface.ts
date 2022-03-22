import type { Schema as GeneratorBaseSchema, NormalizedSchema as GeneratorBaseNormalizedSchema } from '@digiportal/nx-tools/dist/schematics/generator/main.interface'
import type { AvailableGenerators } from '@interfaces'

type TypedBaseSchema = GeneratorBaseSchema<AvailableGenerators>

type TypedBaseNormalizedSchema = GeneratorBaseNormalizedSchema<never, AvailableGenerators>

export type { TypedBaseSchema as Schema, TypedBaseNormalizedSchema as NormalizedSchema }
