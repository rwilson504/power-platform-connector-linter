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
import * as path from "path";
import * as json5 from "json5";
import Ajv4 from "ajv-draft-04";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { addCustomKeywords } from "./customKeywords";
import { SchemaMap } from '../../shared/out/schemaMappings';
import { LinterSettings } from '../../shared/out/types/interfaces';

// Create a connection to the client
const connection: Connection = createConnection(ProposedFeatures.all);
// Create a document manager
const documents = new TextDocuments(TextDocument);

// Define the settings for the linter
let settings: LinterSettings = {
  extendedValidation: true,
};

// Initialize AJV with your settings
// AJV4 is used for draft-04 schemas, AJV is used for other drafts
const ajv4 = new Ajv4({ strict: false });
addFormats(ajv4);
addCustomKeywords(ajv4);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
addCustomKeywords(ajv);

// cahceDir is set in onInitialize which passes the ExtensionContext.globalStorageUri.fsPath
let cacheDir: string = "";

// Flag to track if the extension has been initialized
let initialized = false;

// Load settings from the client
const loadConfig = async () => {
  if (initialized) {
    //get settings for linter
    settings = await connection.workspace.getConfiguration(
      "powerPlatformConnectorLinter"
    );    
  }
};

// Load settings from the client
loadConfig();

// Load the schema content from the file system or cache
async function loadSchemaContent(schemaPath: string) {
  const cachePath = path.join(cacheDir, path.basename(schemaPath));

  // Try to load the schema from cache first
  try {
    if (fs.existsSync(cachePath)) {
      console.log(`Loading schema from cache: ${cachePath}`);
      const cachedSchemaContent = fs.readFileSync(cachePath, "utf-8");
      const schema = json5.parse(cachedSchemaContent);
      return schema;
    }
  } catch (err) {
    console.log(
      `Schema not found in cache: ${cachePath}, loading from file system.`
    );
  }

  // If not in cache, load from the file system
  try {
    // Load the schema from the file system
    const schemaContent = fs.readFileSync(
      path.join(__dirname, schemaPath),
      "utf-8"
    );    
    const schema = json5.parse(schemaContent);
    return schema;
  } catch (err) {
    console.error(`Error loading schema from file system: ${schemaPath}`, err);
    throw new Error(`Failed to load schema: ${schemaPath}`);
  }
}

// Load the schema into AJV and add it to the instance
async function loadSchemaIntoAjv(schemaPath: string) {
  const schema = await loadSchemaContent(schemaPath); // Assuming loadSchemaContent fetches the schema (from cache or filesystem) and parses it

  // Adjust 'id' to '$id' for AJV compatibility if necessary for draft-04 schemas
  if ("id" in schema && !("$id" in schema)) {
    schema.$id = schema.id;
    delete schema.id;
  }

  // Use AJV4 for draft-04 schemas, AJV for other drafts
  const ajvInstance = schema.$schema.includes("draft-04") ? ajv4 : ajv;

  // Add the schema to the AJV instance if it's not already there
  if (!ajvInstance.getSchema(schema.$id)) {
    ajvInstance.addSchema(schema, schema.$id);    
  }

  return schema;
}

// getSchema returns the schema for the given file name
async function getSchema(fileName: string) {
  const schemaConfig = SchemaMap[fileName];
  if (!schemaConfig) {
    console.error(`No schema configuration found for ${fileName}`);
    return null;
  }

  // Load the base schema into AJV
  const baseSchema = await loadSchemaIntoAjv(schemaConfig.localSchemaPath);

  if (settings.extendedValidation && schemaConfig.extendedSchemaPath) {
    // Load the extended schema into AJV, which may refer to the base schema
    const extendedSchema = await loadSchemaIntoAjv(
      schemaConfig.extendedSchemaPath
    );
    return extendedSchema; // Use the extended schema for validation
  } else {
    return baseSchema; // Use the base schema for validation
  }
}

// Validate the text document using the schema

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const fileName = path.basename(textDocument.uri);
  const schema = await getSchema(fileName.toLowerCase());

  if (!schema) {
    console.error(`Failed to load schema for validation: ${fileName}`);
    return; // Skip validation if no schema could be loaded
  }
  const validate = (schema.$schema.includes("draft-04") ? ajv4 : ajv).getSchema(
    schema.$id
  );
  if (!validate) {
    console.error(`Validation function not found for schema: ${schema.$id}`);
    return; // Skip validation if the validation function could not be retrieved
  }

  try {
    // Parse the document text
    const documentText = textDocument.getText();
    // Parse the document text using JSON5
    const data = await json5.parse(documentText);

    // Validate the parsed data
    if (!validate(data)) {
      const diagnostics: Diagnostic[] =
        validate.errors?.map((error) => ({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: textDocument.positionAt(0),
            end: textDocument.positionAt(documentText.length),
          },
          message: `${error.instancePath} ${error.message}`,
          source: "JSON Schema Validation",
        })) ?? []; // Fallback to an empty array if validate.errors is null or undefined

      // Send the diagnostics to the client
      connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    } else {
      // No errors, clear diagnostics
      connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    }
  } catch (error) {
    // Catch any errors that occur during parsing or validation
    console.error(`Error parsing the document: ${error}`);
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
  }
}

// Listen for the initialize request from the client
connection.onInitialize((params: InitializeParams) => {
  
  // Set the cache directory from the client
  cacheDir = params.initializationOptions.cacheDir; 

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      
    },
  };
  return result;
});

// Listen for the initialized notification from the client
connection.onInitialized(async () => {
  initialized = true;  
  await loadConfig();
  documents.all().forEach(validateTextDocument);
  connection.client.register(
    DidChangeConfigurationNotification.type,
    undefined
  );
});

// Listen for the configuration change notification from the client
connection.onDidChangeConfiguration(async (change) => {
  await loadConfig();
  documents.all().forEach(validateTextDocument);
});

// Listen for file changes
connection.onDidChangeWatchedFiles(async (params) => {
  await loadConfig();
  documents.all().forEach(validateTextDocument);
});

// Listen for file saves
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

// Listen for text document changes
documents.onDidChangeContent(async (change) => {
  await validateTextDocument(change.document);
});

// Listen for text document closes
documents.onDidClose((e) => {
  // Clear diagnostics
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// Listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
