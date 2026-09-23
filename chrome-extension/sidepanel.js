// Sidepanel Script: Carga en tiempo real la ficha 360° del contacto desde Supabase
const SUPABASE_URL = 'https://uwfkwcrqqwruzfwzppjf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Zmt3Y3JxcXdydXpmd3pwcGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMjYwOTMsImV4cCI6MjA1NzkwMjA5M30.6iS86zL7uU_oPshm8mQeF8x4e8j3o2p1k5l9m8n7b6v';

let currentContactName = '';

// Escuchar mensaje del content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CHAT_CHANGED' && message.contactName) {
    if (message.contactName !== currentContactName) {
      currentContactName = message.contactName;
      loadContact360(currentContactName);
    }
  }
});

async function loadContact360(name) {
  const nameEl = document.getElementById('c-name');
  const metaEl = document.getElementById('c-meta');
  const dealsListEl = document.getElementById('deals-list');
  const countEl = document.getElementById('deals-count');

  nameEl.innerText = name;
  metaEl.innerText = 'Consultando base de datos UshCRM...';

  try {
    // Buscar en crm_contacts por nombre o coincidencia
    const cleanSearch = name.replace(/\+/g, '').trim();
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/crm_contacts?or=(full_name.ilike.%${encodeURIComponent(cleanSearch)}%,phone.ilike.%${encodeURIComponent(cleanSearch)}%)`, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`
      }
    });

    const contacts = await resp.json();
    const contact = contacts && contacts.length > 0 ? contacts[0] : null;

    if (contact) {
      metaEl.innerText = `${contact.company || 'Mayorista'} · ${contact.city || 'Colombia'} · ${contact.phone ? '+' + contact.phone : ''}`;
      
      // Consultar pedidos en crm_deals
      const dealsResp = await fetch(`${SUPABASE_URL}/rest/v1/crm_deals?contact_id=eq.${contact.id}&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`
        }
      });
      const deals = await dealsResp.json();
      countEl.innerText = deals ? deals.length : 0;

      if (deals && deals.length > 0) {
        dealsListEl.innerHTML = deals.map(d => `
          <div class="deal-item">
            <div class="deal-title">${d.title}</div>
            <div class="deal-amount">$${Number(d.value_cop || 0).toLocaleString('es-CO')} COP</div>
            <div class="deal-stage">${d.stage === 'won' ? 'Ganado / Entregado' : d.stage}</div>
          </div>
        `).join('');
      } else {
        dealsListEl.innerHTML = '<p class="empty-text">Sin pedidos aún para este contacto.</p>';
      }
    } else {
      metaEl.innerText = 'Contacto nuevo (sin ficha previa en CRM)';
      countEl.innerText = '0';
      dealsListEl.innerHTML = '<p class="empty-text">Sin pedidos registrados.</p>';
    }
  } catch (err) {
    metaEl.innerText = 'WhatsApp Web activo · Cliente potencial';
  }
}

document.getElementById('btn-open-crm').addEventListener('click', () => {
  window.open('http://localhost:3000/crm', '_blank');
});
