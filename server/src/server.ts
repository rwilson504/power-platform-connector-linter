import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  Diagnostic,
  Connection,
  DiagnosticSeverity,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  DidChangeConfigurationNotification,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import * as json5 from "json5";
import Ajv4 from "ajv-draft-04";
import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import * as crypto from "crypto";

const connection: Connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

interface SchemaConfig {
  schemaUrl: string; // Assuming you have a URL to fetch the schema from
  localSchemaPath: string; // Path to the local schema file
}

interface SchemaMappings {
  [fileName: string]: SchemaConfig;
}

// Define a mapping of file names to schema URLs and local schema paths
const schemaMappings: SchemaMappings = {
  "settings.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/paconn-settings.schema.json",
    localSchemaPath: "paconn-settings.schema.json",
  },
  "apiproperties.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/paconn-apiProperties.schema.json",
    localSchemaPath: "paconn-apiProperties.schema.json",
  },
  "apidefinition.swagger.json": {
    schemaUrl:
      "https://raw.githubusercontent.com/microsoft/PowerPlatformConnectors/dev/schemas/apiDefinition.swagger.schema.json",
    localSchemaPath: "apiDefinition.swagger.schema.json",
  },
};

// Initialize AJV with your settings
const ajv4 = new Ajv4({ strict: false });
addFormats(ajv4);
const ajv = new Ajv({ strict: false });
addFormats(ajv);

const cacheDir = path.join(__dirname, "schemaCache");

async function cacheSchema(schemaUrl: string, localSchemaPath: string) {
  try {
    const response = await fetch(schemaUrl);
    if (response.ok) {
      const schemaString = await response.text();
      const schema = await json5.parse(schemaString);
      const cachePath = path.join(cacheDir, path.basename(localSchemaPath));

      // Generate checksum for the new schema
      const newSchemaChecksum = crypto
        .createHash("md5")
        .update(schemaString)
        .digest("hex");

      let existingSchemaChecksum = "";

      // Check if the file already exists in the cache
      if (fs.existsSync(cachePath)) {
        // If it exists, generate checksum for the existing schema
        const existingSchema = await fsPromises.readFile(cachePath, "utf-8");
        existingSchemaChecksum = crypto
          .createHash("md5")
          .update(existingSchema)
          .digest("hex");
      }

      // If the checksums do not match, write the new schema to the cache
      if (newSchemaChecksum !== existingSchemaChecksum) {
        await fsPromises.writeFile(cachePath, schemaString);
        console.log(`Cached schema: ${cachePath}`);
      }
    } else {
      console.error(`Failed to fetch schema from URL: ${schemaUrl}`);
    }
  } catch (error) {
    console.error(`Error caching schema from URL ${schemaUrl}:`, error);
  }
}

let initialized = false;

const loadConfig = async () => {
  if (initialized) {
    // Ensure the cache directory exists
    await fsPromises.mkdir(cacheDir, { recursive: true });

    // Load and cache each schema defined in schemaMappings
    for (const key in schemaMappings) {
      const { schemaUrl, localSchemaPath } = schemaMappings[key];
      await cacheSchema(schemaUrl, localSchemaPath);
    }
  }
};

loadConfig();

async function getSchema(fileName: string): Promise<any> {
  const schemaConfig = schemaMappings[fileName];
  if (!schemaConfig) {
    console.error(`No schema configuration found for ${fileName}`);
    return null;
  }

  const cachePath = path.join(
    cacheDir,
    path.basename(schemaConfig.localSchemaPath)
  );

  try {
    let schemaContent;
    if (fs.existsSync(cachePath)) {
      console.log(`Using cached schema for ${fileName}`);
      schemaContent = await fs.promises.readFile(cachePath, "utf-8");
    } else {
      console.log(
        `Cached schema not found for ${fileName}, using local schema`
      );
      schemaContent = fs.readFileSync(
        path.join(__dirname, schemaConfig.localSchemaPath),
        "utf8"
      );
    }

    const schema = json5.parse(schemaContent);

    // Check if the schema has an 'id' property and no '$id' property
    if ("id" in schema && !("$id" in schema)) {
      schema.$id = schema.id;
      delete schema.id; // Remove the old 'id' property
    }

    // Add a property to indicate the schema draft version
    schema.draftVersion = schema.$schema && schema.$schema.includes('draft-04') ? 'draft4' : 'latest';

    return schema;
  } catch (error) {
    console.error(`Error loading schema for ${fileName}:`, error);
    return null;
  }
}

// Cache for compiled validation functions
const compiledValidations = new Map();

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const fileName = path.basename(textDocument.uri);
  const schema = await getSchema(fileName.toLowerCase());

  let validate;
  // Use the draftVersion property to decide which AJV instance to use
  if (schema.draftVersion === 'draft4') {
    if (!ajv4.getSchema(schema.$id)) {
      ajv4.addSchema(schema, schema.$id);
    }
    validate = ajv4.getSchema(schema.$id);
  } else {
    if (!ajv.getSchema(schema.$id)) {
      ajv.addSchema(schema, schema.$id);
    }    
    validate = ajv.getSchema(schema.$id);
  }

  const documentText = textDocument.getText();
  const data = json5.parse(documentText); // Assuming JSON. Add YAML parsing if needed.

  if (validate && !validate(data)) {
    const diagnostics: Diagnostic[] =
      validate.errors?.map((error: ErrorObject) => ({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: textDocument.positionAt(0),
          end: textDocument.positionAt(documentText.length),
        },
        message: `${error.instancePath} ${error.message}`,
        source: "JSON Schema Validation",
      })) ?? []; // Fallback to an empty array if validate.errors is null or undefined

    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  } else {
    // No errors, clear diagnostics
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
  }
}

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
    },
  };
  return result;
});

connection.onInitialized(async () => {
  initialized = true;
  await loadConfig();
  documents.all().forEach(validateTextDocument);
  connection.client.register(
    DidChangeConfigurationNotification.type,
    undefined
  );
});

connection.onDidChangeConfiguration(async (change) => {
  await loadConfig();
  documents.all().forEach(validateTextDocument);
});

connection.onDidChangeWatchedFiles(async (params) => {
  await loadConfig();
  documents.all().forEach(validateTextDocument);
});

documents.onDidSave((change) => {
  documents.all().forEach(async (document) => {
    if (
      document.getText().includes(change.document.uri.replace(/^.*[\\/]/, ""))
    ) {
      //cache.purge();
      await validateTextDocument(document);
    }
  });
});

documents.onDidChangeContent(async (change) => {
  await validateTextDocument(change.document);
});

documents.onDidClose((e) => {
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// Listen for text document changes
documents.listen(connection);

// Listen on the connection
connection.listen();
