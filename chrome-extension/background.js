// Background Service Worker para UshCRM WhatsApp Companion
chrome.runtime.onInstalled.addListener(() => {
  console.log('UshCRM WhatsApp Companion instalado correctamente');
});

// Abrir Side Panel al hacer clic en el icono de la extensión
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.error('Error configurando Side Panel:', err));

// Reenviar mensajes entre el content script y el side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHAT_CHANGED' || message.type === 'SYNC_CONTACT') {
    // Reenviar al Side Panel si está abierto
    chrome.runtime.sendMessage(message).catch(() => {
      // Side Panel no está abierto, ignorar error de canal
    });
    sendResponse({ status: 'ok' });
  }
});
