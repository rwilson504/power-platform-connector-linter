/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import { ExtensionContext } from "vscode";
import * as fs from "fs";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { SchemaMap } from "../../shared/out/schemaMappings";
import * as crypto from "crypto";

let client: LanguageClient;

async function cacheSchema(
  cacheDir: string,
  schemaUrl: string,
  localSchemaPath: string
) {
  try {
    const response = await fetch(schemaUrl);
    if (response.ok) {
      const schemaString = await response.text();
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
        const existingSchema = fs.readFileSync(cachePath, "utf-8");
        existingSchemaChecksum = crypto
          .createHash("md5")
          .update(existingSchema)
          .digest("hex");
      }

      // If the checksums do not match, write the new schema to the cache
      if (newSchemaChecksum !== existingSchemaChecksum) {
        fs.writeFileSync(cachePath, schemaString);
        console.log(`Cached schema: ${cachePath}`);
      }
    } else {
      console.error(`Failed to fetch schema from URL: ${schemaUrl}`);
    }
  } catch (error) {
    console.error(`Error caching schema from URL ${schemaUrl}:`, error);
  }
}

export async function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("dist", "server", "src", "server.js")
  );

  const cacheDir = context.globalStorageUri.fsPath;
  fs.mkdirSync(cacheDir, {recursive: true});

  // Load and cache each schema defined in schemaMappings
  for (const key in SchemaMap) {
    const { schemaUrl, localSchemaPath } = SchemaMap[key];
    await cacheSchema(cacheDir, schemaUrl, localSchemaPath);
  }  

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { scheme: "file", language: "json" },
      { scheme: "file", language: "jsonc" },
    ],
    initializationOptions:{
      cacheDir: cacheDir
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "powerPlatformConnectorLinter",
    "Power Platform Connector Linter",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
