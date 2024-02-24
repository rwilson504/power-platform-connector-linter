export interface SchemaConfig {
  schemaUrl: string; // Assuming you have a URL to fetch the schema from
  localSchemaPath: string; // Path to the local schema file
  extendedSchemaPath?: string; // Optional path to the extended schema file
}

export interface SchemaMappings {
  [fileName: string]: SchemaConfig;
}

export interface LinterSettings {
  extendedValidation: boolean;
}