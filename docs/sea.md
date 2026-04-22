# Single Executable Application (SEA)

LinkBoard supports distribution as a zero-dependency binary using Node.js SEA.

## Why SEA?
- **Zero-Install**: No need to install Node.js on the target machine.
- **WASM SQLite**: Uses `sql.js` (WebAssembly) to avoid native compilation issues across different OS versions.
- **Portability**: Move the `linkboard` file anywhere and run it.

## Building the Binary
1. Ensure you have Node.js 22+ installed.
2. Run the build script:
   ```bash
   npm run build-sea
   ```
3. The resulting binary will be in the root directory named `linkboard` (Linux/macOS) or `linkboard.exe` (Windows).

## How it works
The build script uses `esbuild` to bundle all JavaScript logic into a single file, then uses Node's `--build-sea` flag to inject that code and all associated assets (EJS views, CSS, JS) into the Node.js executable itself.
