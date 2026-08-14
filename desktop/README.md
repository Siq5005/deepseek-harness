# dsh-desktop

English | [中文](README.zh.md)

Minimal Electron shell for the DeepSeek Harness web surface. It starts the
local `dsh web` host on a random loopback port and loads it in a desktop
window, so there is no browser tab to open.

## Development

The development shell expects the repository to be built first:

```sh
# repository root
pnpm install
pnpm run build

cd desktop
npm install
npm start
```

In development (`app.isPackaged === false`) the shell spawns the repository's
`pnpm dsh --profile web` on a random loopback port. In a packaged build it runs
the bundled `@deepseek-ai/dsh` backend through the Electron binary in Node mode,
so the installer does not require a separate Node.js or pnpm installation.

## Build installers

From `desktop/`:

```sh
npm install

# macOS DMG + ZIP
npx electron-builder --mac dmg zip

# Windows NSIS + portable executable (build on Windows, or via CI)
npx electron-builder --win nsis portable
```

The GitHub Actions workflow
`.github/workflows/desktop-build.yml` builds macOS and Windows installers on
native runners and uploads them as workflow artifacts.
