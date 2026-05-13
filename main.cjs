const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.argv.includes('--dev')
let backendProcess = null

function startBackend() {
  backendProcess = spawn('py', ['manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], {
    cwd: __dirname,
    shell: false,
  })

  backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`))
  backendProcess.stderr.on('data', (data) => console.error(`Backend error: ${data}`))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()  // 👈 shut down backend when app closes
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})