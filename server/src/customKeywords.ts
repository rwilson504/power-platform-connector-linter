import Ajv, {
  KeywordDefinition,
  KeywordCxt,
  KeywordErrorDefinition,
} from "ajv";
import { KeywordErrorCxt } from "ajv/dist/types";
import Ajv4 from "ajv-draft-04";
import { _, nil } from "ajv/dist/compile/codegen";

interface DynamicEnumSchema {
  enum: string[];
}

// Example custom keyword for demonstrating a dynamic enum check
export const dynamicEnumCheck: KeywordDefinition = {
  keyword: "dynamicEnumCheck",
  type: "string",
  schemaType: "object",
  code(cxt: KeywordCxt) {
    const { gen, data, schema } = cxt;
    const enumValues = schema.enum;

    // Implementing the check using AJV's codegen API
    const condition = gen.let("condition", false); // Initialize a condition variable to false
    enumValues.forEach((enumValue: string) => {
      // For each enum value, generate a condition to check if the data matches the enum value
      gen.if(_`${data} === ${enumValue}`, () => gen.assign(condition, true));
    });

    // Use the condition to fail the validation if none of the enum values match
    gen.if(_`${condition} === false`, () => cxt.error());
  },
  metaSchema: {
    type: "object",
    properties: {
      enum: { type: "array", items: { type: "string" }, minItems: 1 },
    },
    required: ["enum"],
  },
  error: {
    message: (cxt: KeywordErrorCxt) => `The value must be one of the following: ${cxt.schema.enum.join(", ")}`,
  },
};

// Function to add all custom keywords to an AJV instance
export function addCustomKeywords(ajv: Ajv4 | Ajv): void {
  ajv.addKeyword(dynamicEnumCheck);
}
