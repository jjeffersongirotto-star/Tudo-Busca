// App de computador do Tudo-Busca: abre o site numa janela própria, com ícone e atalho na área de trabalho.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

const ENDERECO = 'https://tudo-busca.onrender.com/?app=windows';
const HOST = 'tudo-busca.onrender.com';

function criarJanela() {
  const janela = new BrowserWindow({
    width: 1400, height: 900, minWidth: 380, minHeight: 600,
    backgroundColor: '#09090f', title: 'Tudo-Busca', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  janela.loadURL(ENDERECO);
  // links de lojas e cupons abrem no navegador padrão
  janela.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  janela.webContents.on('will-navigate', (e, url) => { if (new URL(url).host !== HOST) { e.preventDefault(); shell.openExternal(url); } });
}

Menu.setApplicationMenu(null);
app.whenReady().then(criarJanela);
app.on('window-all-closed', () => app.quit());
