/* ==========================================
   CHER — VIRTUAL CLOSET
   Sistema com foto real do manequim
   ========================================== */

let wardrobe = JSON.parse(localStorage.getItem('cher-wardrobe') || '[]');
let currentLook = JSON.parse(localStorage.getItem('cher-look') || '{}');
let savedLooks = JSON.parse(localStorage.getItem('cher-looks') || '[]');
let currentFilter = 'all';
let currentSelectCategory = '';
let currentPhotoData = null;

const categoryLabels = {
  cabeca: 'Cabeça',
  olhos: 'Olhos',
  superior: 'Superior',
  inferior: 'Inferior',
};

const categoryIcons = {
  cabeca: 'crown',
  olhos: 'eye',
  superior: 'shirt',
  inferior: 'arrow-down-to-line',
};

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  renderCloset();
  renderSavedLooks();
  updateLookCount();
  updateCategoryCounts();
  applyLookToMannequin();
  updateHotspots();

  document.getElementById('f-color').addEventListener('input', (e) => {
    document.getElementById('color-label').textContent = e.target.value;
  });

  lucide.createIcons();
});

// ==========================================
// SIDEBAR
// ==========================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ==========================================
// CATEGORIAS
// ==========================================
function selectCategory(cat, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = cat;
  renderCloset();
}

function updateCategoryCounts() {
  const counts = { all: wardrobe.length };
  Object.keys(categoryLabels).forEach(cat => {
    counts[cat] = wardrobe.filter(i => i.category === cat).length;
  });
  Object.entries(counts).forEach(([cat, count]) => {
    const el = document.getElementById(`count-${cat}`);
    if (el) el.textContent = count;
  });
}

// ==========================================
// FILTRO / BUSCA
// ==========================================
function filterItems() { renderCloset(); }

function getFilteredItems() {
  const search = document.getElementById('search-input').value.toLowerCase().trim();
  let items = wardrobe;
  if (currentFilter !== 'all') items = items.filter(i => i.category === currentFilter);
  if (search) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(search) ||
      (i.tags && i.tags.toLowerCase().includes(search)) ||
      categoryLabels[i.category].toLowerCase().includes(search)
    );
  }
  return items;
}

// ==========================================
// RENDER ARMÁRIO
// ==========================================
function renderCloset() {
  const grid = document.getElementById('pieces-grid');
  const items = getFilteredItems();
  const catForAdd = currentFilter === 'all' ? 'top' : currentFilter;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-grid">
        <i data-lucide="inbox"></i>
        <p>Nenhuma peça aqui ainda</p>
        <button class="btn-add-empty" onclick="openAddModalDirect('${catForAdd}')">
          <i data-lucide="plus"></i> Cadastrar peça
        </button>
      </div>
    `;
    lucide.createIcons({ nodes: grid.querySelectorAll('[data-lucide]') });
    return;
  }

  grid.innerHTML = items.map(item => {
    const isWearing = Object.values(currentLook).includes(item.id);
    const imgContent = item.photo
      ? `<img src="${item.photo}" alt="${item.name}">`
      : `<div class="no-img"><i data-lucide="${categoryIcons[item.category] || 'image'}"></i></div>`;

    return `
      <div class="piece-card ${isWearing ? 'wearing' : ''}"
           onclick="wearItem(${item.id})" title="${item.name}">
        <button class="piece-delete" onclick="deleteItem(${item.id}, event)">
          <i data-lucide="trash-2"></i>
        </button>
        <div class="piece-img">${imgContent}</div>
        <div class="piece-info">
          <div class="piece-name">${item.name}</div>
          <div class="piece-meta">
            <span class="piece-color-dot" style="background:${item.color}"></span>
            ${categoryLabels[item.category]}
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons({ nodes: grid.querySelectorAll('[data-lucide]') });
}

// ==========================================
// VESTIR
// ==========================================
function wearItem(id) {
  const item = wardrobe.find(i => i.id === id);
  if (!item) return;

  if (currentLook[item.category] === id) {
    delete currentLook[item.category];
  } else {
    currentLook[item.category] = id;
  }

  saveLookState();
  renderCloset();
  applyLookToMannequin();
  updateLookCount();
  updateHotspots();
}

// ==========================================
// APLICAR LOOK AO MANEQUIM (FOTO REAL)
// Sobrepõe imagens/cores nas zonas do corpo
// ==========================================
function applyLookToMannequin() {
  // Limpar todas as overlays
  const zones = ['cabeca', 'olhos', 'superior', 'inferior'];
  zones.forEach(zone => {
    const overlay = document.getElementById(`overlay-${zone}`);
    if (overlay) {
      overlay.innerHTML = '';
      overlay.classList.remove('active');
    }
  });

  // Aplicar cada peça do look atual
  Object.entries(currentLook).forEach(([category, itemId]) => {
    const item = wardrobe.find(i => i.id === itemId);
    if (!item) return;

    const overlay = document.getElementById(`overlay-${category}`);
    if (!overlay) return;

    if (item.photo) {
      // Sobrepor a foto da peça na zona
      overlay.innerHTML = `<img src="${item.photo}" alt="${item.name}" draggable="false">`;
    } else {
      // Sobrepor cor sólida
      overlay.innerHTML = `<div class="color-fill" style="background: ${item.color};"></div>`;
    }
    overlay.classList.add('active');
  });
}

// ==========================================
// HOTSPOTS
// ==========================================
function updateHotspots() {
  document.querySelectorAll('.hotspot').forEach(btn => {
    btn.classList.toggle('has-item', !!currentLook[btn.dataset.zone]);
  });
}

function openAddModal(category) {
  const itemsInCategory = wardrobe.filter(i => i.category === category);
  if (itemsInCategory.length > 0) {
    openSelectPanel(category, itemsInCategory);
  } else {
    openAddModalDirect(category);
  }
}

function openAddModalDirect(category) {
  currentPhotoData = null;
  document.getElementById('clothing-form').reset();
  document.getElementById('f-category').value = category || 'top';
  document.getElementById('modal-title').textContent = `Cadastrar ${categoryLabels[category] || 'Peça'}`;
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-remove').style.display = 'none';
  document.getElementById('photo-placeholder').style.display = '';
  document.getElementById('color-label').textContent = '#ff69b4';
  document.getElementById('photo-input').value = '';
  document.getElementById('modal-overlay').classList.add('open');
  lucide.createIcons();
  setTimeout(() => document.getElementById('f-name').focus(), 150);
}

// ==========================================
// SELECT PANEL
// ==========================================
function openSelectPanel(category, items) {
  currentSelectCategory = category;
  const grid = document.getElementById('select-grid');
  document.getElementById('select-title').textContent = `Escolher ${categoryLabels[category]}`;

  let html = '';

  if (currentLook[category]) {
    html += `
      <div class="select-item" onclick="removeWornItem('${category}')" style="border-color: var(--danger);">
        <div class="no-img"><i data-lucide="x"></i><span>Remover</span></div>
      </div>
    `;
  }

  html += items.map(item => {
    const isSelected = currentLook[category] === item.id;
    const imgContent = item.photo
      ? `<img src="${item.photo}" alt="${item.name}">`
      : `<div class="no-img"><i data-lucide="${categoryIcons[item.category] || 'image'}"></i><span>${item.name}</span></div>`;

    return `
      <div class="select-item ${isSelected ? 'selected' : ''}" onclick="selectAndWear(${item.id})">
        ${imgContent}
        ${item.photo ? `<div class="select-item-name">${item.name}</div>` : ''}
      </div>
    `;
  }).join('');

  grid.innerHTML = html;
  document.getElementById('select-overlay').classList.add('open');
  lucide.createIcons({ nodes: grid.querySelectorAll('[data-lucide]') });
}

function selectAndWear(id) { wearItem(id); closeSelect(); }

function removeWornItem(category) {
  delete currentLook[category];
  saveLookState();
  renderCloset();
  applyLookToMannequin();
  updateLookCount();
  updateHotspots();
  closeSelect();
}

function closeSelect() { document.getElementById('select-overlay').classList.remove('open'); }
function closeSelectOutside(e) { if (e.target === e.currentTarget) closeSelect(); }

// ==========================================
// MODAL CADASTRO
// ==========================================
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  currentPhotoData = null;
}
function closeModalOutside(e) { if (e.target === e.currentTarget) closeModal(); }

function triggerPhotoInput() { document.getElementById('photo-input').click(); }

function handlePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX = 500;
      let w = img.width, h = img.height;
      if (w > h) { h = h * MAX / w; w = MAX; }
      else { w = w * MAX / h; h = MAX; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      currentPhotoData = canvas.toDataURL('image/jpeg', 0.75);

      document.getElementById('photo-preview').src = currentPhotoData;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-placeholder').style.display = 'none';
      document.getElementById('photo-remove').style.display = 'flex';
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function removePhoto(e) {
  e.stopPropagation();
  currentPhotoData = null;
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-remove').style.display = 'none';
  document.getElementById('photo-placeholder').style.display = '';
  document.getElementById('photo-input').value = '';
}

function submitClothing(e) {
  e.preventDefault();
  const name = document.getElementById('f-name').value.trim();
  const category = document.getElementById('f-category').value;
  if (!name) return;

  const item = {
    id: Date.now(),
    name,
    category,
    color: document.getElementById('f-color').value,
    tags: document.getElementById('f-tags').value.trim(),
    photo: currentPhotoData,
    createdAt: new Date().toISOString(),
  };

  wardrobe.push(item);
  saveWardrobe();
  closeModal();
  showToast(`"${item.name}" adicionado ao armário`, 'success');

  // Vestir automaticamente
  currentLook[item.category] = item.id;
  saveLookState();
  renderCloset();
  updateCategoryCounts();
  applyLookToMannequin();
  updateLookCount();
  updateHotspots();
}

// ==========================================
// DELETE
// ==========================================
function deleteItem(id, e) {
  e.stopPropagation();
  const item = wardrobe.find(i => i.id === id);
  if (!item) return;

  wardrobe = wardrobe.filter(i => i.id !== id);
  Object.keys(currentLook).forEach(key => {
    if (currentLook[key] === id) delete currentLook[key];
  });

  saveWardrobe();
  saveLookState();
  renderCloset();
  updateCategoryCounts();
  applyLookToMannequin();
  updateLookCount();
  updateHotspots();
  showToast(`"${item.name}" removido`);
}

// ==========================================
// LOOKS
// ==========================================
function clearLook() {
  currentLook = {};
  saveLookState();
  renderCloset();
  applyLookToMannequin();
  updateLookCount();
  updateHotspots();
  showToast('Look limpo');
}

function updateLookCount() {
  const count = Object.keys(currentLook).length;
  document.getElementById('look-count').textContent = `${count} peça${count !== 1 ? 's' : ''}`;
}

function saveLook() {
  if (Object.keys(currentLook).length === 0) {
    showToast('Vista pelo menos uma peça antes de salvar');
    return;
  }
  const name = prompt('Nome do look:');
  if (!name) return;

  savedLooks.push({
    id: Date.now(),
    name: name.trim(),
    items: { ...currentLook },
    date: new Date().toLocaleDateString('pt-BR'),
  });
  localStorage.setItem('cher-looks', JSON.stringify(savedLooks));
  renderSavedLooks();
  showToast(`Look "${name}" salvo!`, 'success');
}

function loadLook(id) {
  const look = savedLooks.find(l => l.id === id);
  if (!look) return;
  currentLook = { ...look.items };
  saveLookState();
  renderCloset();
  applyLookToMannequin();
  updateLookCount();
  updateHotspots();
  showToast(`Look "${look.name}" aplicado`);
}

function deleteLook(id, e) {
  e.stopPropagation();
  savedLooks = savedLooks.filter(l => l.id !== id);
  localStorage.setItem('cher-looks', JSON.stringify(savedLooks));
  renderSavedLooks();
}

function renderSavedLooks() {
  const list = document.getElementById('saved-list');
  if (savedLooks.length === 0) {
    list.innerHTML = `<div style="padding: 14px 16px; color: var(--text-muted); font-size: 0.75rem;">Nenhum look salvo ainda</div>`;
    return;
  }
  list.innerHTML = savedLooks.map(look => `
    <div class="saved-look-item" onclick="loadLook(${look.id})">
      <div class="look-name">${look.name}</div>
      <div class="look-date">${look.date}</div>
      <button class="look-delete" onclick="deleteLook(${look.id}, event)">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `).join('');
  lucide.createIcons({ nodes: list.querySelectorAll('[data-lucide]') });
}

function toggleSavedLooks() {
  const list = document.getElementById('saved-list');
  const chevron = document.getElementById('saved-chevron');
  list.classList.toggle('open');
  chevron.style.transform = list.classList.contains('open') ? 'rotate(180deg)' : '';
}

// ==========================================
// PERSISTÊNCIA
// ==========================================
function saveWardrobe() { localStorage.setItem('cher-wardrobe', JSON.stringify(wardrobe)); }
function saveLookState() { localStorage.setItem('cher-look', JSON.stringify(currentLook)); }

// ==========================================
// TOAST
// ==========================================
function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'info'}"></i> ${message}`;
  container.appendChild(toast);
  lucide.createIcons({ nodes: toast.querySelectorAll('[data-lucide]') });
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ==========================================
// ATALHOS
// ==========================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeSelect(); closeAiResult(); }
});

// ==========================================
// POLLINATIONS.AI — GERAÇÃO DE IMAGEM GRÁTIS
// ==========================================

function closeAiResult() {
  document.getElementById('ai-result-overlay').classList.remove('open');
}

function closeAiResultOutside(e) { if (e.target === e.currentTarget) closeAiResult(); }

function generateWithAI() {
  if (Object.keys(currentLook).length === 0) {
    showToast('Vista pelo menos uma peça antes de gerar com IA');
    return;
  }
  doGenerateWithAI();
}

async function doGenerateWithAI() {
  const overlay = document.getElementById('ai-result-overlay');
  const loading = document.getElementById('ai-loading');
  const img = document.getElementById('ai-result-img');
  const text = document.getElementById('ai-result-text');
  const footer = document.getElementById('ai-result-footer');

  loading.style.display = 'flex';
  img.style.display = 'none';
  text.style.display = 'none';
  footer.style.display = 'none';
  overlay.classList.add('open');
  lucide.createIcons();

  try {
    // 1. Montar descrição curta das peças
    const pieces = [];
    Object.entries(currentLook).forEach(([cat, id]) => {
      const item = wardrobe.find(i => i.id === id);
      if (!item) return;
      pieces.push(`${item.name} (${item.color})`);
    });

    // 2. Prompt curto e direto
    const prompt = `Fashion photo, young woman wearing ${pieces.join(', ')}, elegant pose, white studio, photorealistic, full body`;

    // 3. Gerar URL da Pollinations
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1024&seed=${seed}&nologo=true`;

    // 4. Carregar a imagem com retry
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(imageUrl);
      if (response.ok) break;
      if (response.status === 429 && attempt < 2) {
        // Esperar antes de tentar de novo
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
      }
    }

    if (!response.ok) throw new Error(`Servidor ocupado (${response.status}). Tente novamente em alguns segundos.`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      loading.style.display = 'none';
      img.style.display = 'block';
      footer.style.display = 'flex';
      showToast('Look gerado com sucesso!', 'success');
    };
    img.onerror = () => {
      loading.style.display = 'none';
      text.textContent = 'Falha ao carregar a imagem gerada. Tente novamente.';
      text.style.display = 'block';
      footer.style.display = 'flex';
    };
    img.src = objectUrl;

  } catch (error) {
    loading.style.display = 'none';
    text.textContent = `Erro: ${error.message}`;
    text.style.display = 'block';
    footer.style.display = 'flex';
    showToast('Erro ao gerar imagem');
    console.error('Pollinations AI error:', error);
  }
}

function downloadAiImage() {
  const img = document.getElementById('ai-result-img');
  if (!img.src || img.style.display === 'none') return;

  // Converter para download
  fetch(img.src)
    .then(r => r.blob())
    .then(blob => {
      const link = document.createElement('a');
      link.download = `cher-look-ai-${Date.now()}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    });
}
