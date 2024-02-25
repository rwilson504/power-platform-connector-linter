import { SchemaMappings } from "./types/interfaces";

// Define a mapping of file names to schema URLs and local schema paths
export const SchemaMap: SchemaMappings = {
  "settings.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/paconn-settings.schema.json",
    localSchemaPath: "paconn-settings.schema.json",
  },
  "apiproperties.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/paconn-apiProperties.schema.json",
    localSchemaPath: "paconn-apiProperties.schema.json",
    extendedSchemaPath: "paconn-apiProperties.extended.schema.json",
  },
  "apidefinition.swagger.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/apiDefinition.swagger.schema.json",
    localSchemaPath: "apiDefinition.swagger.schema.json",
    extendedSchemaPath: "apiDefinition.swagger.extended.schema.json",
  },
};
