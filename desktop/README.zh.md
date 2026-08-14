# dsh-desktop

[English](README.md) | 中文

DeepSeek Harness Web UI 的最小 Electron 套壳桌面版本。它会在随机回环端口上启动本地
`dsh web`，并在桌面窗口中加载，因此无需浏览器标签页。

## 开发

开发模式需要先构建仓库：

```sh
# 仓库根目录
pnpm install
pnpm run build

cd desktop
npm install
npm start
```

开发模式（`app.isPackaged === false`）下，套壳会在随机回环端口上启动仓库的
`pnpm dsh --profile web`。打包后的版本则通过 Electron 的 Node 模式运行内置的
`@deepseek-ai/dsh` 后端，因此安装包不需要单独安装 Node.js 或 pnpm。

## 构建安装包

在 `desktop/` 目录下：

```sh
npm install

# macOS DMG + ZIP
npx electron-builder --mac dmg zip

# Windows NSIS + portable（在 Windows 上构建，或通过 CI）
npx electron-builder --win nsis portable
```

GitHub Actions 工作流 `.github/workflows/desktop-build.yml` 会在原生 runner 上分别
构建 macOS 和 Windows 安装包，并上传为 workflow artifact。
