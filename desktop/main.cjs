const { app, BrowserWindow } = require('electron')
const { spawn } = require('node:child_process')
const http = require('node:http')
const net = require('node:net')
const path = require('node:path')

// desktop/ sits directly under the repository root, so the monorepo root is
// one directory up. The host is spawned from there with `pnpm dsh`.
const REPO_ROOT = path.resolve(__dirname, '..')
const HOST = '127.0.0.1'

let hostProcess = null
let mainWindow = null

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, HOST, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function waitForServer(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  const probe = () => new Promise((resolve) => {
    const req = http.get({ host: HOST, port, path: '/', timeout: 1000 }, (res) => {
      res.resume()
      resolve(true)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })

  return (async () => {
    while (Date.now() < deadline) {
      if (await probe()) return
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`dsh web did not become ready on ${HOST}:${port} within ${timeoutMs}ms`)
  })()
}

function startHost(port) {
  const args = ['--profile', 'web', '--host', HOST, '--port', String(port)]
  if (app.isPackaged) {
    // In the packaged app the backend is bundled under node_modules and runs
    // through the Electron binary in Node mode, so the installer does not
    // require pnpm or a separately installed Node.js.
    const backendEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
    hostProcess = spawn(process.execPath, ['--expose-internals', backendEntry, ...args], {
      cwd: app.getPath('home'),
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } else {
    // Development: reuse the repository's source-launch `pnpm dsh`.
    hostProcess = spawn('pnpm', ['dsh', ...args], {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }

  hostProcess.stdout.on('data', (chunk) => process.stdout.write(`[dsh] ${chunk}`))
  hostProcess.stderr.on('data', (chunk) => process.stderr.write(`[dsh] ${chunk}`))
  hostProcess.on('exit', (code, signal) => {
    process.stdout.write(`[dsh] host exited: code=${code} signal=${signal}\n`)
    hostProcess = null
  })
}

function stopHost() {
  if (hostProcess && !hostProcess.killed) {
    hostProcess.kill('SIGTERM')
    hostProcess = null
  }
}

async function createWindow() {
  const port = await findFreePort()
  startHost(port)
  await waitForServer(port)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'DeepSeek Harness',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.on('did-finish-load', () => {
    process.stdout.write('[dsh] window loaded\n')
  })
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    process.stderr.write(`[dsh] window failed to load: ${code} ${description}\n`)
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.loadURL(`http://${HOST}:${port}/`)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(createWindow).catch((error) => {
    console.error(error)
    app.exit(1)
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow().catch(console.error)
})

app.on('before-quit', () => {
  stopHost()
})
