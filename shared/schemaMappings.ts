import { SchemaMappings } from "./types/interfaces";

// Define a mapping of file names to schema URLs and local schema paths
export const SchemaMap: SchemaMappings = {
  "settings.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/paconn-settings.schema.json",
    localSchemaPath: "/schema/paconn-settings.schema.json",
  },
  "apiproperties.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/paconn-apiProperties.schema.json",
    localSchemaPath: "/schema/paconn-apiProperties.schema.json",
    extendedSchemaPath: "/schema/paconn-apiProperties.extended.schema.json",
  },
  "apidefinition.swagger.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/apiDefinition.swagger.schema.json",
    localSchemaPath: "/schemas/apiDefinition.swagger.schema.json",
    extendedSchemaPath: "/schemas/apiDefinition.swagger.extended.schema.json",
  },
};
