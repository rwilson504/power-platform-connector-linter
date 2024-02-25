import Ajv, {
  KeywordDefinition,
  KeywordCxt,
  KeywordErrorDefinition,
} from "ajv";
import { KeywordErrorCxt } from "ajv/dist/types";
import Ajv4 from "ajv-draft-04";
import { _, nil } from "ajv/dist/compile/codegen";

export const validSentence: KeywordDefinition = {
  keyword: "validSentenceWithPunctuation",
  code(cxt: KeywordCxt) {
    const { gen, schema, data } = cxt;
    if (typeof schema !== "object" || typeof schema.minWords !== "number" || typeof schema.endWithPunctuation !== "boolean") {
      throw new Error("Schema for validSentenceWithPunctuation must be an object with minWords and endWithPunctuation properties.");
    }

    const minWords = schema.minWords;
    const endWithPunctuation = schema.endWithPunctuation;

    const wordsArray = gen.const("wordsArray", _`${data}.split(/\\s+/).filter(Boolean)`);
    const wordsCount = gen.const("wordsCount", _`${wordsArray}.length`);
    const isValidLength = gen.let("isValidLength", _`${wordsCount} >= ${minWords}`);
    const endsWithPunctuation = gen.let("endsWithPunctuation", _`/[.!?]$/.test(${data})`);

    gen.if(_`!${isValidLength}`, () => {
      cxt.error();
    });

    if (endWithPunctuation) {
      gen.if(_`!${endsWithPunctuation}`, () => {
        cxt.error();
      });
    }
  },
  error: {
    message: (cxt: KeywordErrorCxt) => `"Must be a descriptive sentence with at least " + ${cxt.schema.minWords} + " words" + (${cxt.schema.endWithPunctuation} ? " and end in punctuation" : "") + "."`
  },
  metaSchema: {
    type: "object",
    properties: {
      minWords: { type: "integer", minimum: 1 },
      endWithPunctuation: { type: "boolean" },
    },
    required: ["minWords", "endWithPunctuation"],
    additionalProperties: false,
  },
};

export const startWithCapital: KeywordDefinition = {
  keyword: "startsWithCapital",
  code(cxt: KeywordCxt) {
    const {data} = cxt;
    cxt.gen
      .if(_`typeof ${data} === "string"`) // Ensure data is a string
      .if(
        _`!/^[A-Z]/.test(${data})`,
        () => cxt.error()
      );
  },
  error:{
    message: `String must start with a capital letter.`
  },
  metaSchema: {
    type: "boolean",
  },
};

export const forbiddenWords: KeywordDefinition = {
  keyword: 'forbiddenWords',
  type: 'string',
  schemaType: 'array',
  code(cxt) {
    const {gen, data, schema} = cxt;
    // Ensure the schema for forbiddenWords is an array of strings
    if (Array.isArray(schema) && schema.every(word => typeof word === 'string')) {
      schema.forEach((word) => {
        // Generate code to check if the data includes any forbidden word
        gen.if(_`${data}.includes(${word})`, () => {
          cxt.error();
        });
      });
    } else {
      throw new Error('The schema for forbiddenWords must be an array of strings');
    }
  },
  metaSchema: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  error: {
    message: (cxt: KeywordErrorCxt) => `The string must not include any of the following words: ${cxt.schema.join(', ')}`
  } // Custom keyword is generating validation errors
};

export const isEnglish: KeywordDefinition = {
  keyword: "isEnglish",
  type: "string",
  schemaType: "boolean",
  code(cxt: KeywordCxt) {
    const { data } = cxt;
    // Regular expression to match English characters, digits, and basic punctuation
    const pattern = _`/^[A-Za-z0-9 .,;:'"?!-\\/()]+$/`;

    // Generate the validation code
    cxt.fail(_`!${pattern}.test(${data})`);
  },
  error: {
    message: (cxt: KeywordErrorCxt) => `The string must be in English`,
  },
  metaSchema: {
    type: "boolean",
  },  
};

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

// Define the custom keyword for PascalCase validation using code generation
const validOperationId: KeywordDefinition = {
  keyword: "validateOperationId",
  type: "string",
  // Using the code generation function for performance and safety
  code(cxt: KeywordCxt) {
    // Extract the CodeGen instance and the data reference
    const {gen, data} = cxt;
    // Define the regular expression for PascalCase
    // This regex ensures the string starts with an uppercase letter and only contains alphanumeric characters without any special characters like hyphens or underscores
    const pascalCaseRegex = '^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*$';
    
    // Generate the validation code
    // Check if the operationId matches the PascalCase pattern
    const isValid = _`${data}.match(${pascalCaseRegex})`;
    // If the operationId does not match the pattern, report an error
    gen.if(_`!${isValid}`, () => cxt.error());
  },
  error:{
    message: (cxt: KeywordErrorCxt) => `OperationId must be in PascalCase without hyphens or underscores`      
  }
};

const allowedCategories = [
  "AI", "Business Management", "Business Intelligence", "Collaboration", "Commerce", "Communication", 
  "Content and Files", "Finance", "Data", "Human Resources", "Internet of Things", "IT Operations", 
  "Lifestyle and Entertainment", "Marketing", "Productivity", "Sales and CRM", "Security", 
  "Social Media", "Website"
];
const validCategories: KeywordDefinition = {
  keyword: "validateCategories",
  type: "array",
  schemaType: "boolean",
  code(cxt) {
    const { gen, data } = cxt;
    // Assuming the data structure is within an object that contains the propertyName and propertyValue
    const categoriesData = gen.const('categoriesData', _`${data}.find(item => item.propertyName === "Categories")`);
  
    // Early exit if "Categories" property is not found
    gen.if(_`${categoriesData} && typeof ${categoriesData}.propertyValue === "string"`, () => {
      const categoriesArray = gen.const('categoriesArray', _`${categoriesData}.propertyValue.split(";").map(s => s.trim())`);
  
      // Iterate over each category in the array
      gen.forOf('category', categoriesArray, (category) => {
        // Check if the category is in the list of allowed categories
        gen.if(
          _`!${JSON.stringify(allowedCategories)}.includes(${category})`,
          () => {
            // If a category is not allowed, trigger a validation error
            cxt.error();
          }
        );
      });
    });
  },
  error:{
    message: (cxt: KeywordErrorCxt) => `"Categories must be one of the following: ${allowedCategories.join(", ")}"`
  },  
  metaSchema: {
    type: "boolean",
  }
};

// Function to add all custom keywords to an AJV instance
export function addCustomKeywords(ajv: Ajv4 | Ajv): void {
  ajv.addKeyword(dynamicEnumCheck);
  ajv.addKeyword(isEnglish);
  ajv.addKeyword(forbiddenWords);
  ajv.addKeyword(startWithCapital);
  ajv.addKeyword(validSentence);
  ajv.addKeyword(validOperationId);
  ajv.addKeyword(validCategories);
}
