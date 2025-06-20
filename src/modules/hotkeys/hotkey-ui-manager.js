// Enhanced Hotkey UI Manager - Erweiterte UI für Hotkeys mit Decks und Multi-Aktionen
class HotkeyUIManager {
  constructor(hotkeyManager, uiManager) {
    this.hotkeyManager = hotkeyManager;
    this.uiManager = uiManager;
    this.elements = {};
    this.currentView = 'hotkeys'; // 'hotkeys' or 'decks'
    this.selectedHotkey = null;
    this.draggedHotkey = null;
    
    console.log('HotkeyUIManager: Initializing enhanced hotkey UI...');
    this.initializeUI();
  }

  initializeUI() {
    this.setupElements();
    this.setupEventListeners();
    this.loadHotkeyCardSize(); // Load saved card size
    this.updateDisplay();
    
    console.log('HotkeyUIManager: Enhanced UI initialized');
  }

  setupElements() {
    // Get hotkeys section
    this.hotkeySection = document.getElementById('hotkeysSection');
    if (!this.hotkeySection) {
      console.error('HotkeyUIManager: Hotkeys section not found');
      return;
    }

    // Enhanced header
    this.updateHotkeyHeader();
    
    // Create main container
    this.createMainContainer();
  }

  updateHotkeyHeader() {
    const header = this.hotkeySection.querySelector('.section-header');
    if (!header) return;

    header.innerHTML = `
      <div class="header-left">
        <h2>Hotkeys & Decks</h2>
        <div class="view-switcher">
          <button class="view-btn active" data-view="hotkeys">🎹 Hotkeys</button>
          <button class="view-btn" data-view="decks">🎛️ Decks</button>
        </div>
        <div class="hotkey-size-controls">
          <button class="size-control-btn" data-size="small" title="Kleine Karten">S</button>
          <button class="size-control-btn active" data-size="medium" title="Mittlere Karten">M</button>
          <button class="size-control-btn" data-size="large" title="Große Karten">L</button>
        </div>
      </div>
      <div class="header-right">
        <div class="hotkey-stats" id="hotkeyStats">
          <span class="stat-item">0 Hotkeys</span>
          <span class="stat-item">0 Decks</span>
        </div>
        <div class="hotkey-actions">
          <button class="action-btn" id="createHotkeyBtn" title="Neuen Hotkey erstellen">➕</button>
          <button class="action-btn" id="createDeckBtn" title="Neues Deck erstellen">🎛️➕</button>
          <button class="action-btn" id="learnHotkeyBtn" title="Hotkey lernen">🎓</button>
          <button class="action-btn" id="importExportBtn" title="Import/Export">💾</button>
        </div>
      </div>
    `;

    // Add event listeners for header buttons
    this.setupHeaderListeners();
  }

  setupHeaderListeners() {
    // View switcher
    const viewBtns = this.hotkeySection.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
        
        // Update active state
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Size control buttons
    const sizeControlBtns = this.hotkeySection.querySelectorAll('.size-control-btn');
    sizeControlBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        this.setHotkeyCardSize(size);
        
        // Update active state
        sizeControlBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Action buttons
    const createHotkeyBtn = document.getElementById('createHotkeyBtn');
    const createDeckBtn = document.getElementById('createDeckBtn');
    const learnHotkeyBtn = document.getElementById('learnHotkeyBtn');
    const importExportBtn = document.getElementById('importExportBtn');

    createHotkeyBtn?.addEventListener('click', () => this.showCreateHotkeyDialog());
    createDeckBtn?.addEventListener('click', () => this.showCreateDeckDialog());
    learnHotkeyBtn?.addEventListener('click', () => this.startQuickLearning());
    importExportBtn?.addEventListener('click', () => this.showImportExportDialog());
  }

  createMainContainer() {
    const existingContent = this.hotkeySection.querySelector('.hotkey-mappings');
    if (existingContent) {
      existingContent.remove();
    }

    const container = document.createElement('div');
    container.className = 'enhanced-hotkey-container';
    container.innerHTML = `
      <div class="hotkey-content" id="hotkeyContent">
        <!-- Hotkeys/Decks will be rendered here -->
      </div>
      
      <!-- Hotkey Details Panel -->
      <div class="hotkey-details-panel" id="hotkeyDetailsPanel" style="display: none;">
        <div class="panel-header">
          <h3 id="detailsTitle">Hotkey Details</h3>
          <button class="panel-close" id="closePanelBtn">×</button>
        </div>
        <div class="panel-content" id="panelContent">
          <!-- Details content will be rendered here -->
        </div>
      </div>
    `;

    this.hotkeySection.appendChild(container);

    // Cache elements
    this.elements = {
      content: document.getElementById('hotkeyContent'),
      detailsPanel: document.getElementById('hotkeyDetailsPanel'),
      detailsTitle: document.getElementById('detailsTitle'),
      panelContent: document.getElementById('panelContent'),
      closePanelBtn: document.getElementById('closePanelBtn')
    };

    // Panel close button
    this.elements.closePanelBtn?.addEventListener('click', () => this.hideDetailsPanel());
  }

  setupEventListeners() {
    // Hotkey manager events
    this.hotkeyManager.on('hotkeyCreated', () => this.updateDisplay());
    this.hotkeyManager.on('hotkeyUpdated', () => this.updateDisplay());
    this.hotkeyManager.on('hotkeyDeleted', () => this.updateDisplay());
    this.hotkeyManager.on('deckCreated', () => this.updateDisplay());
    this.hotkeyManager.on('deckUpdated', () => this.updateDisplay());
    this.hotkeyManager.on('deckDeleted', () => this.updateDisplay());
    this.hotkeyManager.on('deckSwitched', (deck) => this.onDeckSwitched(deck));
    this.hotkeyManager.on('hotkeyExecuted', (data) => this.onHotkeyExecuted(data));
    this.hotkeyManager.on('hapticFeedback', () => this.triggerHapticFeedback());
  }

  setHotkeyCardSize(size) {
    const content = this.elements.content;
    if (!content) return;

    // Remove existing size classes
    content.classList.remove('hotkey-size-small', 'hotkey-size-medium', 'hotkey-size-large');
    
    // Add new size class
    content.classList.add(`hotkey-size-${size}`);
    
    // Save size preference
    if (window.settingsManager) {
      window.settingsManager.set('ui.hotkeyCardSize', size);
    }
    
    console.log(`HotkeyUIManager: Card size changed to ${size}`);
  }

  loadHotkeyCardSize() {
    if (window.settingsManager) {
      const savedSize = window.settingsManager.get('ui.hotkeyCardSize', 'medium');
      this.setHotkeyCardSize(savedSize);
      
      // Update button active state
      const sizeBtn = this.hotkeySection.querySelector(`[data-size="${savedSize}"]`);
      if (sizeBtn) {
        const allSizeBtns = this.hotkeySection.querySelectorAll('.size-control-btn');
        allSizeBtns.forEach(btn => btn.classList.remove('active'));
        sizeBtn.classList.add('active');
      }
    }
  }

  switchView(view) {
    this.currentView = view;
    this.updateDisplay();
  }

  updateDisplay() {
    this.updateStats();
    
    // Load saved card size on first display
    if (this.elements.content && !this.elements.content.classList.contains('hotkey-size-small') && 
        !this.elements.content.classList.contains('hotkey-size-medium') && 
        !this.elements.content.classList.contains('hotkey-size-large')) {
      this.loadHotkeyCardSize();
    }
    
    if (this.currentView === 'hotkeys') {
      this.renderHotkeysView();
    } else if (this.currentView === 'decks') {
      this.renderDecksView();
    }
  }

  updateStats() {
    const stats = this.hotkeyManager.getStats();
    const statsElement = document.getElementById('hotkeyStats');
    if (statsElement) {
      statsElement.innerHTML = `
        <span class="stat-item">${stats.totalHotkeys} Hotkeys</span>
        <span class="stat-item">${stats.totalDecks} Decks</span>
      `;
    }
  }

  // ===== HOTKEYS VIEW =====

  renderHotkeysView() {
    if (!this.elements.content) return;

    const standaloneHotkeys = this.hotkeyManager.getStandaloneHotkeys();
    const decks = this.hotkeyManager.getMainDecks();

    let html = '';

    // Standalone hotkeys section
    if (standaloneHotkeys.length > 0) {
      html += `
        <div class="hotkey-section standalone-hotkeys">
          <h3 class="section-title">Einzelne Hotkeys</h3>
          <div class="hotkey-grid adaptive-grid" id="standaloneGrid">
            ${standaloneHotkeys.map(hotkey => this.renderHotkeyCard(hotkey)).join('')}
          </div>
        </div>
      `;
    }

    // Decks with their hotkeys
    decks.forEach(deck => {
      const deckHotkeys = this.hotkeyManager.getHotkeysByDeck(deck.id);
      html += `
        <div class="hotkey-section deck-section" data-deck-id="${deck.id}">
          <div class="deck-header">
            <h3 class="section-title">
              <span class="deck-icon">🎛️</span>
              ${deck.name}
              <span class="deck-info">(${deck.rows}×${deck.columns})</span>
            </h3>
            <div class="deck-actions">
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.switchToDeck('${deck.id}')" title="Zu diesem Deck wechseln">🎯</button>
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.editDeck('${deck.id}')" title="Deck bearbeiten">✏️</button>
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.learnDeckHotkeys('${deck.id}')" title="Deck-Hotkeys lernen">🎓</button>
            </div>
          </div>
          <div class="deck-grid" style="grid-template-columns: repeat(${deck.columns}, 1fr); grid-template-rows: repeat(${deck.rows}, 1fr);">
            ${this.renderDeckGrid(deck, deckHotkeys)}
          </div>
          <div class="deck-sub-sections">
            ${this.renderSubDecks(deck.id)}
          </div>
        </div>
      `;
    });

    // Empty state
    if (standaloneHotkeys.length === 0 && decks.length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-icon">🎹</div>
          <h3>Keine Hotkeys vorhanden</h3>
          <p>Erstelle deinen ersten Hotkey oder importiere eine Konfiguration</p>
          <div class="empty-actions">
            <button class="btn-primary" onclick="window.hotkeyUIManager.showCreateHotkeyDialog()">Hotkey erstellen</button>
            <button class="btn-secondary" onclick="window.hotkeyUIManager.showCreateDeckDialog()">Deck erstellen</button>
          </div>
        </div>
      `;
    }

    this.elements.content.innerHTML = html;
    this.setupHotkeyInteractions();
  }

  renderHotkeyCard(hotkey) {
    const triggerCount = hotkey.triggers.length;
    const actionCount = hotkey.actions.length;
    const triggerText = triggerCount > 0 ? 
      hotkey.triggers.map(t => this.getTriggerDisplayText(t)).join(', ') : 
      'Kein Trigger';

    return `
      <div class="hotkey-card ${hotkey.enabled ? '' : 'disabled'}" 
           data-hotkey-id="${hotkey.id}"
           onclick="window.hotkeyUIManager.handleCardClick(event, '${hotkey.id}')"
           oncontextmenu="window.hotkeyUIManager.handleCardRightClick(event, '${hotkey.id}')">
        <div class="hotkey-card-header">
          <span class="hotkey-name">${hotkey.name}</span>
          <div class="hotkey-status">
            <span class="status-indicator ${hotkey.enabled ? 'enabled' : 'disabled'}"></span>
          </div>
        </div>
        <div class="hotkey-card-body">
          <div class="hotkey-triggers">
            <span class="trigger-text">${triggerText}</span>
          </div>
          <div class="hotkey-actions-summary">
            <span class="actions-count">${actionCount} ${actionCount !== 1 ? 'Aktionen' : 'Aktion'}</span>
            ${hotkey.lastTriggered ? `<span class="last-triggered">${new Date(hotkey.lastTriggered).toLocaleTimeString()}</span>` : ''}
          </div>
        </div>
        ${hotkey.description ? `<div class="hotkey-description">${hotkey.description}</div>` : ''}
      </div>
    `;
  }

  renderDeckGrid(deck, deckHotkeys) {
    const totalSlots = deck.rows * deck.columns;
    let html = '';

    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / deck.columns);
      const col = i % deck.columns;
      const position = { row, col };
      
      const hotkey = deckHotkeys.find(h => 
        h.position && h.position.row === row && h.position.col === col
      );

      if (hotkey) {
        html += `
          <div class="deck-slot occupied" 
               data-position="${row},${col}"
               data-hotkey-id="${hotkey.id}"
               onclick="window.hotkeyUIManager.selectHotkey('${hotkey.id}')">
            <div class="slot-content">
              <div class="slot-name">${hotkey.name}</div>
              <div class="slot-trigger">${this.getShortTriggerText(hotkey.triggers[0])}</div>
            </div>
            <div class="slot-controls">
              <button class="slot-control-btn" onclick="event.stopPropagation(); window.hotkeyUIManager.executeHotkey('${hotkey.id}')" title="Ausführen">▶️</button>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="deck-slot empty" 
               data-position="${row},${col}"
               onclick="window.hotkeyUIManager.createHotkeyForSlot('${deck.id}', ${row}, ${col})">
            <div class="slot-placeholder">
              <span class="add-icon">➕</span>
              <span class="add-text">Hotkey hinzufügen</span>
            </div>
          </div>
        `;
      }
    }

    return html;
  }

  renderSubDecks(parentDeckId) {
    const subDecks = this.hotkeyManager.getSubDecks(parentDeckId);
    if (subDecks.length === 0) return '';

    return `
      <div class="sub-decks">
        <h4>Unter-Decks:</h4>
        <div class="sub-deck-list">
          ${subDecks.map(subDeck => `
            <div class="sub-deck-item" data-deck-id="${subDeck.id}">
              <span class="sub-deck-name">${subDeck.name}</span>
              <div class="sub-deck-actions">
                <button class="sub-deck-btn" onclick="window.hotkeyUIManager.switchToDeck('${subDeck.id}')" title="Wechseln">🎯</button>
                <button class="sub-deck-btn" onclick="window.hotkeyUIManager.editDeck('${subDeck.id}')" title="Bearbeiten">✏️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ===== DECKS VIEW =====

  renderDecksView() {
    if (!this.elements.content) return;

    const decks = this.hotkeyManager.getAllDecks();
    const currentDeck = this.hotkeyManager.getCurrentDeck();
    const breadcrumb = this.getDeckBreadcrumb();

    if (decks.length === 0) {
      this.elements.content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎛️</div>
          <h3>Keine Decks vorhanden</h3>
          <p>Decks ermöglichen es, Hotkeys in vordefinierten Anordnungen zu organisieren</p>
          <div class="empty-actions">
            <button class="btn-primary" onclick="window.hotkeyUIManager.showCreateDeckDialog()">Erstes Deck erstellen</button>
          </div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="decks-overview">
        <div class="deck-navigation">
          ${breadcrumb ? `
            <div class="current-deck-indicator">
              <span class="indicator-label">Aktiver Pfad:</span>
              <span class="current-deck-name">${breadcrumb}</span>
              ${currentDeck && currentDeck.isSubDeck ? `
                <button class="back-btn" onclick="window.hotkeyUIManager.backToMainDeck()" title="Zurück zum Haupt-Deck">⬅ Zurück</button>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="decks-grid">
          ${decks.map(deck => this.renderDeckOverviewCard(deck)).join('')}
        </div>
      </div>
    `;

    this.elements.content.innerHTML = html;
  }

  renderDeckOverviewCard(deck) {
    const hotkeyCount = this.hotkeyManager.getHotkeysByDeck(deck.id).length;
    const totalSlots = deck.rows * deck.columns;
    const isCurrent = this.hotkeyManager.getCurrentDeck()?.id === deck.id;

    return `
      <div class="deck-overview-card ${isCurrent ? 'current' : ''}" data-deck-id="${deck.id}">
        <div class="deck-card-header">
          <h3 class="deck-card-title">${deck.name}</h3>
          <div class="deck-type-badge ${deck.isSubDeck ? 'sub-deck' : 'main-deck'}">
            ${deck.isSubDeck ? 'Unter-Deck' : 'Haupt-Deck'}
          </div>
        </div>
        
        <div class="deck-card-body">
          <div class="deck-preview">
            <div class="preview-grid" style="grid-template-columns: repeat(${Math.min(deck.columns, 4)}, 1fr);">
              ${this.renderDeckPreview(deck, hotkeyCount)}
            </div>
          </div>
          
          <div class="deck-stats">
            <span class="stat">${hotkeyCount}/${totalSlots} Slots belegt</span>
            <span class="stat">${deck.rows}×${deck.columns} Layout</span>
          </div>
          
          ${deck.description ? `<div class="deck-description">${deck.description}</div>` : ''}
        </div>
        
        <div class="deck-card-actions">
          <button class="deck-card-btn primary" onclick="window.hotkeyUIManager.switchToDeck('${deck.id}')">
            ${isCurrent ? '✓ Aktiv' : 'Aktivieren'}
          </button>
          <button class="deck-card-btn" onclick="window.hotkeyUIManager.editDeck('${deck.id}')" title="Bearbeiten">✏️</button>
          <button class="deck-card-btn" onclick="window.hotkeyUIManager.learnDeckHotkeys('${deck.id}')" title="Hotkeys lernen">🎓</button>
          <button class="deck-card-btn" onclick="window.hotkeyUIManager.duplicateDeck('${deck.id}')" title="Duplizieren">📋</button>
          <button class="deck-card-btn danger" onclick="window.hotkeyUIManager.deleteDeck('${deck.id}')" title="Löschen">🗑️</button>
        </div>
      </div>
    `;
  }

  renderDeckPreview(deck, hotkeyCount) {
    const maxPreviewSlots = 16;
    const totalSlots = Math.min(deck.rows * deck.columns, maxPreviewSlots);
    let html = '';

    for (let i = 0; i < totalSlots; i++) {
      const hasHotkey = i < hotkeyCount;
      html += `<div class="preview-slot ${hasHotkey ? 'occupied' : 'empty'}"></div>`;
    }

    return html;
  }

  // ===== CARD INTERACTION HANDLERS =====

  handleCardClick(event, hotkeyId) {
    event.preventDefault();
    event.stopPropagation();
    
    // Left click executes the hotkey
    this.executeHotkey(hotkeyId);
    
    // Visual feedback
    const card = event.currentTarget;
    card.classList.add('executing');
    setTimeout(() => {
      card.classList.remove('executing');
    }, 300);
    
    // Show execution feedback
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (hotkey && window.uiManager && window.uiManager.showHotkeyExecutionFeedback) {
      window.uiManager.showHotkeyExecutionFeedback(hotkey.name);
    }
  }

  handleCardRightClick(event, hotkeyId) {
    event.preventDefault();
    event.stopPropagation();
    
    // Right click shows context menu
    this.showHotkeyContextMenu(event, hotkeyId);
  }

  showHotkeyContextMenu(event, hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    // Remove existing context menu
    const existingMenu = document.querySelector('.hotkey-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'hotkey-context-menu';
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="execute">
        <span class="menu-icon">▶️</span>
        <span class="menu-text">Ausführen</span>
      </div>
      <div class="context-menu-item" data-action="edit">
        <span class="menu-icon">✏️</span>
        <span class="menu-text">Bearbeiten</span>
      </div>
      <div class="context-menu-item" data-action="duplicate">
        <span class="menu-icon">📋</span>
        <span class="menu-text">Duplizieren</span>
      </div>
      <div class="context-menu-item" data-action="toggle">
        <span class="menu-icon">${hotkey.enabled ? '🔅' : '🔆'}</span>
        <span class="menu-text">${hotkey.enabled ? 'Deaktivieren' : 'Aktivieren'}</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" data-action="delete">
        <span class="menu-icon">🗑️</span>
        <span class="menu-text">Löschen</span>
      </div>
    `;

    // Position menu
    const x = Math.min(event.clientX, window.innerWidth - 200);
    const y = Math.min(event.clientY, window.innerHeight - 250);
    
    contextMenu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      z-index: 10000;
    `;

    document.body.appendChild(contextMenu);

    // Add event listeners
    contextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('.context-menu-item')?.dataset.action;
      if (action) {
        this.handleContextMenuAction(hotkeyId, action);
        contextMenu.remove();
      }
    });

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  handleContextMenuAction(hotkeyId, action) {
    switch (action) {
      case 'execute':
        this.executeHotkey(hotkeyId);
        break;
      case 'edit':
        this.editHotkey(hotkeyId);
        break;
      case 'duplicate':
        this.duplicateHotkey(hotkeyId);
        break;
      case 'toggle':
        this.toggleHotkey(hotkeyId);
        break;
      case 'delete':
        this.deleteHotkey(hotkeyId);
        break;
    }
  }

  setupHotkeyInteractions() {
    // Make hotkey cards draggable for reordering
    const hotkeyCards = this.elements.content.querySelectorAll('.hotkey-card');
    hotkeyCards.forEach(card => {
      card.draggable = true;
      card.addEventListener('dragstart', this.handleDragStart.bind(this));
      card.addEventListener('dragover', this.handleDragOver.bind(this));
      card.addEventListener('drop', this.handleDrop.bind(this));
    });

    // Make deck slots accept drops
    const deckSlots = this.elements.content.querySelectorAll('.deck-slot');
    deckSlots.forEach(slot => {
      slot.addEventListener('dragover', this.handleDragOver.bind(this));
      slot.addEventListener('drop', this.handleDrop.bind(this));
    });
  }

  handleDragStart(event) {
    const hotkeyId = event.target.dataset.hotkeyId;
    if (hotkeyId) {
      this.draggedHotkey = hotkeyId;
      event.dataTransfer.setData('text/plain', hotkeyId);
      event.target.classList.add('dragging');
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    event.target.classList.add('drag-over');
  }

  handleDrop(event) {
    event.preventDefault();
    event.target.classList.remove('drag-over');

    const hotkeyId = this.draggedHotkey || event.dataTransfer.getData('text/plain');
    if (!hotkeyId) return;

    // Handle dropping on deck slot
    if (event.target.classList.contains('deck-slot')) {
      this.handleDropOnDeckSlot(event.target, hotkeyId);
    }

    // Cleanup
    this.draggedHotkey = null;
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  }

  handleDropOnDeckSlot(slot, hotkeyId) {
    const position = slot.dataset.position;
    const deckId = slot.closest('[data-deck-id]')?.dataset.deckId;
    
    if (!position || !deckId) return;

    const [row, col] = position.split(',').map(Number);
    
    // Update hotkey position
    this.hotkeyManager.updateHotkey(hotkeyId, {
      deckId: deckId,
      position: { row, col }
    });

    this.updateDisplay();
    this.uiManager.showSuccessMessage('Hotkey zu Deck-Position hinzugefügt!');
  }

  // ===== HOTKEY ACTIONS =====

  selectHotkey(hotkeyId) {
    this.selectedHotkey = hotkeyId;
    this.showHotkeyDetails(hotkeyId);
  }

  executeHotkey(hotkeyId) {
    this.hotkeyManager.executeHotkey(hotkeyId);
  }

  editHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    this.showHotkeyEditDialog(hotkey);
  }

  toggleHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    this.hotkeyManager.updateHotkey(hotkeyId, { enabled: !hotkey.enabled });
    this.uiManager.showSuccessMessage(`Hotkey ${hotkey.enabled ? 'aktiviert' : 'deaktiviert'}`);
  }

  deleteHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    if (confirm(`Hotkey "${hotkey.name}" wirklich löschen?`)) {
      this.hotkeyManager.deleteHotkey(hotkeyId);
      this.hideDetailsPanel();
      this.uiManager.showSuccessMessage('Hotkey gelöscht');
    }
  }

  createHotkeyForSlot(deckId, row, col) {
    this.showCreateHotkeyDialog({
      deckId: deckId,
      position: { row, col }
    });
  }

  // ===== DECK ACTIONS =====

  // ===== DECK MANAGEMENT WITH ACTIVATION LOGIC =====

  switchToDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    // Only allow switching to main decks or sub-decks from main decks
    const currentDeck = this.hotkeyManager.getCurrentDeck();
    
    if (deck.isSubDeck) {
      // Sub-deck can only be activated from a main deck
      if (!currentDeck || currentDeck.isSubDeck) {
        this.uiManager.showErrorMessage('Deck-Wechsel', 'Unter-Decks können nur von Haupt-Decks aus aktiviert werden.');
        return;
      }
    }

    this.hotkeyManager.switchToDeck(deckId);
    
    // Show navigation feedback
    const deckType = deck.isSubDeck ? 'Unter-Deck' : 'Haupt-Deck';
    this.uiManager.showSuccessMessage(`${deckType} "${deck.name}" aktiviert!`);
  }

  // Enhanced deck switching with breadcrumb navigation
  getDeckBreadcrumb() {
    const currentDeck = this.hotkeyManager.getCurrentDeck();
    if (!currentDeck) return '';

    if (currentDeck.isSubDeck && currentDeck.parentDeckId) {
      const parentDeck = this.hotkeyManager.getDeckById(currentDeck.parentDeckId);
      return `${parentDeck?.name || 'Haupt-Deck'} → ${currentDeck.name}`;
    }

    return currentDeck.name;
  }

  // Back to main deck functionality
  backToMainDeck() {
    const currentDeck = this.hotkeyManager.getCurrentDeck();
    
    if (currentDeck && currentDeck.isSubDeck && currentDeck.parentDeckId) {
      this.switchToDeck(currentDeck.parentDeckId);
    } else {
      // Switch to first main deck or deactivate
      const mainDecks = this.hotkeyManager.getMainDecks();
      if (mainDecks.length > 0) {
        this.switchToDeck(mainDecks[0].id);
      } else {
        this.hotkeyManager.switchToDeck(null);
        this.uiManager.showSuccessMessage('Alle Decks deaktiviert');
      }
    }
  }

  editDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    this.showDeckEditDialog(deck);
  }

  deleteDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    if (confirm(`Deck "${deck.name}" wirklich löschen? Alle Hotkeys werden zu Einzelhotkeys.`)) {
      this.hotkeyManager.deleteDeck(deckId);
      this.uiManager.showSuccessMessage('Deck gelöscht');
    }
  }

  duplicateDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    const newDeck = this.hotkeyManager.createDeck({
      name: `${deck.name} (Kopie)`,
      description: deck.description,
      rows: deck.rows,
      columns: deck.columns,
      parentDeckId: deck.parentDeckId
    });

    // Copy hotkeys
    const deckHotkeys = this.hotkeyManager.getHotkeysByDeck(deckId);
    deckHotkeys.forEach(hotkey => {
      this.hotkeyManager.createHotkey({
        name: `${hotkey.name} (Kopie)`,
        description: hotkey.description,
        deckId: newDeck.id,
        position: hotkey.position
      });
    });

    this.uiManager.showSuccessMessage('Deck dupliziert!');
  }

  learnDeckHotkeys(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    this.showDeckLearningDialog(deck);
  }

  // ===== UTILITY METHODS =====

  getTriggerDisplayText(trigger) {
    switch (trigger.type) {
      case 'midi':
        return trigger.data.description || 'MIDI';
      case 'keyboard':
        return trigger.data.description || 'Keyboard';
      case 'click':
        return 'Click';
      default:
        return 'Unknown';
    }
  }

  getShortTriggerText(trigger) {
    if (!trigger) return '?';
    
    switch (trigger.type) {
      case 'midi':
        return trigger.data.description?.split(' ')[0] || 'MIDI';
      case 'keyboard':
        return trigger.data.key || 'Key';
      case 'click':
        return 'Click';
      default:
        return '?';
    }
  }

  // ===== EVENT HANDLERS =====

  onDeckSwitched(deck) {
    this.updateDisplay();
    this.triggerHapticFeedback();
  }

  onHotkeyExecuted(data) {
    if (data.success) {
      this.triggerHapticFeedback();
    }
    
    // Update last triggered time in UI
    this.updateDisplay();
  }

  triggerHapticFeedback() {
    // Visual feedback animation
    document.body.classList.add('hotkey-triggered');
    setTimeout(() => {
      document.body.classList.remove('hotkey-triggered');
    }, 200);
  }

  // ===== DIALOG METHODS =====

  showHotkeyDetails(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    this.elements.detailsTitle.textContent = hotkey.name;
    this.elements.panelContent.innerHTML = this.renderHotkeyDetailsContent(hotkey);
    this.elements.detailsPanel.style.display = 'block';
  }

  renderHotkeyDetailsContent(hotkey) {
    return `
      <div class="hotkey-details">
        <div class="detail-section">
          <h4>Grundinformationen</h4>
          <div class="detail-item">
            <label>Name:</label>
            <span>${hotkey.name}</span>
          </div>
          <div class="detail-item">
            <label>Beschreibung:</label>
            <span>${hotkey.description || 'Keine Beschreibung'}</span>
          </div>
          <div class="detail-item">
            <label>Status:</label>
            <span class="status ${hotkey.enabled ? 'enabled' : 'disabled'}">
              ${hotkey.enabled ? '✓ Aktiviert' : '✗ Deaktiviert'}
            </span>
          </div>
          <div class="detail-item">
            <label>Ausführungen:</label>
            <span>${hotkey.triggerCount}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>Trigger (${hotkey.triggers.length})</h4>
          ${hotkey.triggers.length === 0 ? 
            '<p class="empty-message">Keine Trigger konfiguriert</p>' :
            hotkey.triggers.map(trigger => `
              <div class="trigger-item">
                <span class="trigger-type">${this.getTriggerDisplayText(trigger)}</span>
                <button class="remove-btn" onclick="window.hotkeyUIManager.removeTrigger('${hotkey.id}', '${trigger.type}')">×</button>
              </div>
            `).join('')
          }
          <button class="add-btn" onclick="window.hotkeyUIManager.addTriggerToHotkey('${hotkey.id}')">+ Trigger hinzufügen</button>
        </div>

        <div class="detail-section">
          <h4>Aktionen (${hotkey.actions.length})</h4>
          ${hotkey.actions.length === 0 ? 
            '<p class="empty-message">Keine Aktionen konfiguriert</p>' :
            hotkey.actions.map((action, index) => `
              <div class="action-item" data-action-id="${action.id}">
                <span class="action-order">${index + 1}.</span>
                <span class="action-type">${this.getActionDisplayText(action)}</span>
                ${action.delay > 0 ? `<span class="action-delay">(${action.delay}ms Verzögerung)</span>` : ''}
                <button class="remove-btn" onclick="window.hotkeyUIManager.removeAction('${hotkey.id}', '${action.id}')">×</button>
              </div>
            `).join('')
          }
          <button class="add-btn" onclick="window.hotkeyUIManager.addActionToHotkey('${hotkey.id}')">+ Aktion hinzufügen</button>
        </div>

        <div class="detail-actions">
          <button class="btn-primary" onclick="window.hotkeyUIManager.executeHotkey('${hotkey.id}')">▶️ Ausführen</button>
          <button class="btn-secondary" onclick="window.hotkeyUIManager.editHotkey('${hotkey.id}')">✏️ Bearbeiten</button>
          <button class="btn-secondary" onclick="window.hotkeyUIManager.duplicateHotkey('${hotkey.id}')">📋 Duplizieren</button>
          <button class="btn-danger" onclick="window.hotkeyUIManager.deleteHotkey('${hotkey.id}')">🗑️ Löschen</button>
        </div>
      </div>
    `;
  }

  getActionDisplayText(action) {
    switch (action.type) {
      case 'obs_scene_switch':
        return `Szene wechseln: ${action.data.sceneName}`;
      case 'obs_source_visibility':
        return `Source ${action.data.visible ? 'einblenden' : 'ausblenden'}: ${action.data.sourceName}`;
      case 'obs_raw_request':
        return `OBS Request: ${action.data.requestType}`;
      case 'deck_switch':
        const deck = this.hotkeyManager.getDeckById(action.data.deckId);
        return `Deck wechseln: ${deck?.name || 'Unbekannt'}`;
      case 'audio_volume':
        return `Lautstärke: ${action.data.sourceName} → ${Math.round(action.data.volume * 100)}%`;
      case 'audio_mute':
        return `${action.data.muted ? 'Stumm' : 'Laut'}: ${action.data.sourceName}`;
      default:
        return action.type;
    }
  }

  hideDetailsPanel() {
    this.elements.detailsPanel.style.display = 'none';
    this.selectedHotkey = null;
  }

  // ===== DIALOG METHODS =====
  // These delegate to the dialog manager

  showCreateHotkeyDialog(options = {}) {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showCreateHotkeyDialog(options);
    }
  }

  showCreateDeckDialog() {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showCreateDeckDialog();
    }
  }

  startQuickLearning() {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.startQuickLearning();
    }
  }

  showImportExportDialog() {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showImportExportDialog();
    }
  }

  showHotkeyEditDialog(hotkey) {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showHotkeyEditDialog(hotkey);
    }
  }

  showDeckEditDialog(deck) {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showDeckEditDialog(deck);
    }
  }

  showDeckLearningDialog(deck) {
    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showDeckLearningDialog(deck);
    }
  }

  // ===== ADDITIONAL HELPER METHODS =====

  duplicateHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    const newHotkey = this.hotkeyManager.createHotkey({
      name: `${hotkey.name} (Kopie)`,
      description: hotkey.description,
      deckId: hotkey.deckId,
      position: null // Will be assigned to next available position
    });

    // Copy triggers
    hotkey.triggers.forEach(trigger => {
      this.hotkeyManager.addTriggerToHotkey(newHotkey.id, trigger);
    });

    // Copy actions
    hotkey.actions.forEach(action => {
      this.hotkeyManager.addActionToHotkey(newHotkey.id, {
        type: action.type,
        data: { ...action.data },
        delay: action.delay
      });
    });

    this.uiManager.showSuccessMessage(`Hotkey "${hotkey.name}" dupliziert!`);
  }

  removeTrigger(hotkeyId, triggerType) {
    this.hotkeyManager.removeTriggerFromHotkey(hotkeyId, triggerType);
    this.showHotkeyDetails(hotkeyId); // Refresh details panel
  }

  removeAction(hotkeyId, actionId) {
    this.hotkeyManager.removeActionFromHotkey(hotkeyId, actionId);
    this.showHotkeyDetails(hotkeyId); // Refresh details panel
  }

  addTriggerToHotkey(hotkeyId) {
    this.hotkeyManager.startLearningMode((trigger) => {
      this.hotkeyManager.addTriggerToHotkey(hotkeyId, trigger);
      this.showHotkeyDetails(hotkeyId); // Refresh details panel
      this.uiManager.showSuccessMessage('Trigger hinzugefügt!');
    }, hotkeyId);
  }

  addActionToHotkey(hotkeyId) {
    // Show a simple action selector
    const actionType = prompt('Aktion auswählen:\n\n1. obs_scene_switch - Szene wechseln\n2. obs_recording_toggle - Aufnahme umschalten\n3. obs_streaming_toggle - Stream umschalten\n4. audio_mute - Audio stumm schalten\n\nGib die Nummer ein:');
    
    const actionMap = {
      '1': 'obs_scene_switch',
      '2': 'obs_recording_toggle', 
      '3': 'obs_streaming_toggle',
      '4': 'audio_mute'
    };
    
    const selectedType = actionMap[actionType];
    if (!selectedType) return;
    
    let actionData = {};
    
    // Get action-specific data
    if (selectedType === 'obs_scene_switch') {
      const scenes = window.obsManager?.getScenes() || [];
      if (scenes.length === 0) {
        this.uiManager.showErrorMessage('Keine Szenen', 'Keine OBS-Szenen verfügbar');
        return;
      }
      const sceneName = prompt(`Szene auswählen:\n\n${scenes.map((s, i) => `${i+1}. ${s.sceneName}`).join('\n')}\n\nGib die Nummer ein:`);
      const sceneIndex = parseInt(sceneName) - 1;
      if (sceneIndex >= 0 && sceneIndex < scenes.length) {
        actionData = { sceneName: scenes[sceneIndex].sceneName };
      } else {
        return;
      }
    } else if (selectedType === 'audio_mute') {
      const sources = window.audioManager?.getAllAudioSources() || [];
      if (sources.length === 0) {
        this.uiManager.showErrorMessage('Keine Audio-Quellen', 'Keine Audio-Quellen verfügbar');
        return;
      }
      const sourceName = prompt(`Audio-Quelle auswählen:\n\n${sources.map((s, i) => `${i+1}. ${s.name}`).join('\n')}\n\nGib die Nummer ein:`);
      const sourceIndex = parseInt(sourceName) - 1;
      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        actionData = { sourceName: sources[sourceIndex].name, muted: true };
      } else {
        return;
      }
    }
    
    this.hotkeyManager.addActionToHotkey(hotkeyId, {
      type: selectedType,
      data: actionData
    });
    
    this.showHotkeyDetails(hotkeyId); // Refresh details panel
    this.uiManager.showSuccessMessage('Aktion hinzugefügt!');
  }

  // ===== CLEANUP =====

  destroy() {
    // Remove event listeners and cleanup
    console.log('HotkeyUIManager: Cleaning up...');
  }
}

// Export for global access
console.log('HotkeyUIManager: Enhanced UI system loaded');
window.HotkeyUIManager = HotkeyUIManager;