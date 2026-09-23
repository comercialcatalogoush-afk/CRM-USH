// Content Script para WhatsApp Web: detección de chat e inyección de sugerencias IA
(function() {
  let lastContactName = '';
  let aiContainer = null;
  let isFetching = false;

  // Respuestas inteligentes mayoristas de respaldo para Ush By Ushuaia
  const DEFAULT_SUGGESTIONS = [
    {
      tipo: 'catalogo',
      texto: '¡Hola! Con gusto te comparto nuestro catálogo mayorista digital: https://ushbyushuaia.vercel.app/catalogo con precios y descuentos especiales.'
    },
    {
      tipo: 'pedido',
      texto: 'Para tu pedido mayorista tenemos disponible pack surtido desde 12 unidades con envío inmediato. ¿Qué referencias y tallas te gustaron?'
    },
    {
      tipo: 'despacho',
      texto: 'Perfecto, ya tenemos tus datos registrados. Te confirmamos el número de guía de despacho en cuanto el paquete salga con la transportadora.'
    }
  ];

  // Inyectar texto en el campo editable de WhatsApp Web
  function insertText(text) {
    const box = document.querySelector('footer div[contenteditable="true"][role="textbox"]')
             || document.querySelector('footer div[contenteditable="true"]')
             || document.querySelector('footer [data-tab="10"]');

    if (!box) {
      console.warn('No se encontró el cuadro de texto de WhatsApp Web');
      return;
    }

    box.focus();
    // Insertar texto compatible con el editor de WhatsApp Web
    document.execCommand('insertText', false, text);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Renderizar la barra de sugerencias sobre el footer
  function renderSuggestions(suggs, contactName) {
    const footer = document.querySelector('#main footer');
    if (!footer) return;

    if (!aiContainer) {
      aiContainer = document.createElement('div');
      aiContainer.id = 'ush-crm-ai-container';
      footer.parentNode.insertBefore(aiContainer, footer);
    }

    aiContainer.innerHTML = `
      <div id="ush-crm-ai-header">
        <div class="ush-crm-ai-title">
          <span>✨ UshCRM IA · Sugerencias</span>
          <span class="ush-crm-ai-badge">${contactName || 'Chat activo'}</span>
        </div>
        <span style="font-size: 10px; color: #8696a0; text-transform: none;">Clic para insertar en el chat</span>
      </div>
      <div id="ush-crm-ai-chips"></div>
    `;

    const chipsContainer = aiContainer.querySelector('#ush-crm-ai-chips');
    suggs.forEach(s => {
      const chip = document.createElement('button');
      chip.className = 'ush-crm-chip';
      chip.title = s.texto;
      chip.innerHTML = `<span class="ush-crm-chip-icon">💬</span> ${s.texto}`;
      chip.onclick = (e) => {
        e.preventDefault();
        insertText(s.texto);
      };
      chipsContainer.appendChild(chip);
    });
  }

  // Extraer últimos mensajes de la conversación
  function extractMessages() {
    const msgEls = document.querySelectorAll('#main .message-in, #main .message-out');
    const msgs = [];
    msgEls.forEach(el => {
      const isFromMe = el.classList.contains('message-out');
      const textSpan = el.querySelector('.copyable-text span') || el.querySelector('.copyable-text');
      if (textSpan && textSpan.innerText) {
        msgs.push({
          content: textSpan.innerText.trim(),
          is_from_me: isFromMe
        });
      }
    });
    return msgs.slice(-15);
  }

  // Solicitar sugerencias a la API de UshCRM o fallback
  async function fetchSuggestions(contactName) {
    if (isFetching) return;
    isFetching = true;
    const msgs = extractMessages();

    try {
      const resp = await fetch('http://localhost:3000/api/crm-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          mensajes: msgs,
          modo: 'completo'
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.mensajesSugeridos && data.mensajesSugeridos.length > 0) {
          const formatted = data.mensajesSugeridos.map(t => ({ tipo: 'ia', texto: t }));
          renderSuggestions(formatted, contactName);
          return;
        }
      }
    } catch (e) {
      // UshCRM local no está respondiendo en este momento, usar motor offline
    } finally {
      isFetching = false;
    }

    // Sugerencias adaptativas según el último mensaje del cliente
    const lastIncoming = [...msgs].reverse().find(m => !m.is_from_me);
    let contextual = [...DEFAULT_SUGGESTIONS];

    if (lastIncoming && lastIncoming.content) {
      const txt = lastIncoming.content.toLowerCase();
      if (txt.includes('precio') || txt.includes('cuanto') || txt.includes('costo') || txt.includes('mayor')) {
        contextual = [
          { tipo: 'precio', texto: 'Nuestros precios mayoristas van desde $38.000 a $48.000 por prenda según la referencia en pack de 12 unidades.' },
          { tipo: 'catalogo', texto: '¡Hola! Te dejo aquí nuestro catálogo digital con todos los precios mayoristas detallados: https://ushbyushuaia.vercel.app/catalogo' },
          { tipo: 'descuento', texto: 'Para pedidos superiores a 24 unidades te otorgamos un 5% de descuento adicional sobre el total mayorista.' }
        ];
      } else if (txt.includes('talla') || txt.includes('medida') || txt.includes('guia')) {
        contextual = [
          { tipo: 'tallas', texto: 'Manejamos tallas 6, 8, 10, 12 y 14 en línea dama y S, M, L, XL en hombre. ¿Qué tallas necesitas para tu boutique?' },
          { tipo: 'guia', texto: 'Puedes consultar nuestra tabla oficial de medidas aquí: https://ushbyushuaia.vercel.app/como-comprar' },
          { tipo: 'surtido', texto: 'Puedes armar tu pedido con tallas surtidas a tu gusto según lo que más vendas.' }
        ];
      } else if (txt.includes('envio') || txt.includes('despacho') || txt.includes('guia') || txt.includes('transportadora')) {
        contextual = [
          { tipo: 'despacho', texto: 'Despachamos por Interrapidísimo y Envía a todo Colombia. Tu pedido tarda entre 24 y 48 horas en llegar.' },
          { tipo: 'guia', texto: 'En cuanto la transportadora recoja el paquete te enviamos el número de guía para que puedas rastrearlo en tiempo real.' },
          { tipo: 'flete', texto: 'El costo del flete se liquida contraentrega directamente con la transportadora al recibir en tu dirección.' }
        ];
      }
    }

    renderSuggestions(contextual, contactName);
  }

  // Observador de cambios en el chat activo
  function checkChat() {
    const header = document.querySelector('#main header');
    if (!header) {
      if (aiContainer) {
        aiContainer.remove();
        aiContainer = null;
      }
      return;
    }

    const titleEl = header.querySelector('span[title]') || header.querySelector('[dir="auto"]');
    const contactName = titleEl ? (titleEl.getAttribute('title') || titleEl.innerText || '').trim() : '';

    if (contactName && contactName !== lastContactName) {
      lastContactName = contactName;
      // Notificar al Side Panel para cargar ficha del cliente
      chrome.runtime.sendMessage({
        type: 'CHAT_CHANGED',
        contactName
      }).catch(() => {});

      // Generar sugerencias
      fetchSuggestions(contactName);
    }
  }

  // Iniciar observador de mutaciones del DOM de WhatsApp Web
  const observer = new MutationObserver(() => {
    checkChat();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Chequeo periódico de seguridad
  setInterval(checkChat, 2000);
  console.log('UshCRM WhatsApp Companion activo en WhatsApp Web');
})();
