const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.argv.includes('--dev')
let backendProcess = null
let mainWindow = null
let tray = null

const iconPath = isDev
  ? path.join(__dirname, 'public', 'icon.png')
  : path.join(process.resourcesPath, 'icon.png')

  // Single instance lock — prevents multiple instances of the app
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// Register custom protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('terminator', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('terminator')
}

function handleDeepLink(url) {
  const route = url.replace('terminator://', '/')
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    if (isDev) {
      mainWindow.loadURL(`http://localhost:5173${route}`)
    } else {
      mainWindow.loadFile(path.join(__dirname, 'dist/index.html'), { hash: route })
    }
  }
}

// Windows: deep link comes in as a second instance
app.on('second-instance', (event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('terminator://'))
  if (url) handleDeepLink(url)
  else {
    // Just focus the window if no deep link
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

function startBackend() {
  backendProcess = spawn('py', ['manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], {
    cwd: __dirname,
    shell: false,
  })
  backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`))
  backendProcess.stderr.on('data', (data) => console.error(`Backend error: ${data}`))
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(iconPath))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open The Terminator',
      click: () => { mainWindow.show(); mainWindow.focus() }
    },
    {
      label: 'Alerts',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        if (isDev) {
          mainWindow.loadURL('http://localhost:5173/alerts')
        } else {
          mainWindow.loadFile(path.join(__dirname, 'dist/index.html'), { hash: '/alerts' })
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (backendProcess) backendProcess.kill()
        app.exit(0)  // bypass the close intercept
      }
    }
  ])

  tray.setToolTip('The Terminator')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { mainWindow.show(); mainWindow.focus() })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    event.preventDefault()
    mainWindow.hide()
  })
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
  createTray()
})

// Keep app alive in tray — don't quit when window is closed
app.on('window-all-closed', () => {})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})