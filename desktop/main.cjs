const { app, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { createStaticServer } = require('./static-server.cjs');

function webRoot() {
  const packaged = path.join(process.resourcesPath, 'web');
  if (app.isPackaged && fs.existsSync(path.join(packaged, 'index.html'))) return packaged;
  return path.resolve(__dirname, '..', 'build');
}

app.whenReady().then(() => {
  const root = webRoot();
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    console.error(`VeriBench desktop could not find the web build at ${root}.`);
    console.error('From the repository root, run: npm run build');
    app.exit(1);
    return;
  }

  const server = createStaticServer(root);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const win = new BrowserWindow({
      width: 1280,
      height: 840,
      title: 'VeriBench',
      backgroundColor: '#f5f1e6',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    const url = `http://127.0.0.1:${port}/`;
    console.log(`VeriBench desktop ${url}`);
    win.loadURL(url);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
