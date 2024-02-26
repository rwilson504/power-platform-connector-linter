# Power Platform Connector Linter

The Power Platform Connector Linter extension for Visual Studio Code provides real-time linting, validation, and best practices enforcement for Power Platform connector definitions. It helps developers and Power Platform enthusiasts ensure their connector definitions adhere to Microsoft's best practices and schema specifications.

## Features

- **Real-time Linting and Validation:** Instantly identifies issues and errors in your connector definition files as you type, reducing the need for manual reviews and debugging.
- **Schema Validation:** Validates connector definition files against the official Power Platform connector schema, ensuring compatibility and correctness.
- **Best Practices Enforcement:** Highlights deviations from best practices recommended by Microsoft for developing Power Platform connectors.
- **Customizable Rules:** By default, this extension is configured to lint files rigorously to ensure that when they are submitted for publishing to Microsoft, they are less likely to encounter any issues. For users looking for basic validation, the extended linting feature can be turned off, allowing for just basic OpenAPI linting. This feature enables users to enable or disable specific linting rules to tailor the extension to their project's needs.
- **Support for Multiple File Types:** Works with `settings.json`, `apiProperties.json`, and `apiDefinition.swagger.json` files, covering all major aspects of connector definitions.

## Installation

To install the Power Platform Connector Linter extension:

1. Open Visual Studio Code.
2. Navigate to the Extensions view by clicking on the square icon on the sidebar or pressing `Ctrl+Shift+X`.
3. Search for "Power Platform Connector Linter" in the Extensions marketplace search bar.
4. Click "Install" on the extension's marketplace page.

## Usage

To use the Power Platform Connector Linter:

1. **Set Document Language:** Ensure your document language is set to JSON. You can do this by clicking on the language indicator in the status bar at the bottom right corner and selecting "JSON" from the list.
2. **Name Your Document Correctly:** The document name must match one of the files downloaded by the `paconn` tool (`settings.json`, `apiProperties.json`, or `apiDefinition.swagger.json`). This naming convention is crucial for the extension to apply the correct validation rules.
3. **Write or Edit Your Connector Definition:** As you type or make changes to your connector definition, the extension will automatically lint and validate your JSON according to the schema and best practices.
4. **View and Resolve Issues:** Any issues detected will be highlighted in the editor. Hover over the highlighted sections to see detailed descriptions of the issues and suggestions for resolution.

## Configuration

This extension works out of the box with default settings optimized for general use. However, you can customize the behavior of the linter by accessing the extension settings in VS Code:

1. Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P` on macOS.
2. Type "Preferences: Open Settings (UI)" and press Enter.
3. Search for "Power Platform Connector Linter" to find extension-specific settings.
4. Adjust the settings as needed to fit your workflow and project requirements.

## Support and Feedback

For support, questions, or feedback, please [create an issue](https://github.com/rwilson504/power-platform-connector-linter/issues) on the GitHub repository dedicated to this extension. Your contributions and suggestions are welcome to help improve this tool for the Power Platform community.
