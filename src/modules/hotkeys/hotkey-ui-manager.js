// Enhanced Hotkey UI Manager - Persistente Deck-Ansicht mit gleichzeitiger Anzeige aller Hauptdecks
class HotkeyUIManager {
  constructor(hotkeyManager, uiManager) {
    this.hotkeyManager = hotkeyManager;
    this.uiManager = uiManager;
    this.elements = {};
    this.draggedHotkey = null;
    
    console.log('HotkeyUIManager: Initializing persistent deck view UI...');
    this.initializeUI();
  }

  initializeUI() {
    this.setupElements();
    this.setupEventListeners();
    this.loadHotkeyCardSize();
    this.updateDisplay();
    
    console.log('HotkeyUIManager: Persistent deck view UI initialized');
  }

  setupElements() {
    // Get hotkeys section
    this.hotkeySection = document.getElementById('hotkeysSection');
    if (!this.hotkeySection) {
      console.error('HotkeyUIManager: Hotkeys section not found');
      return;
    }

    // Enhanced header with new controls
    this.updateHotkeyHeader();
    
    // Create main container for persistent view
    this.createMainContainer();
  }

  updateHotkeyHeader() {
    const header = this.hotkeySection.querySelector('.section-header');
    if (!header) return;

    header.innerHTML = `
      <div class="header-left">
        <h2>🎛️ Hotkeys & Decks</h2>
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
    const existingContent = this.hotkeySection.querySelector('.hotkey-mappings, .enhanced-hotkey-container');
    if (existingContent) {
      existingContent.remove();
    }

    const container = document.createElement('div');
    container.className = 'persistent-hotkey-container';
    container.innerHTML = `
      <div class="hotkey-content" id="hotkeyContent">
        <!-- Standalone hotkeys and all main decks will be rendered here -->
      </div>
    `;

    this.hotkeySection.appendChild(container);

    // Cache elements
    this.elements = {
      content: document.getElementById('hotkeyContent')
    };
  }

  setupEventListeners() {
    // Hotkey manager events
    this.hotkeyManager.on('hotkeyCreated', () => this.updateDisplay());
    this.hotkeyManager.on('hotkeyUpdated', () => this.updateDisplay());
    this.hotkeyManager.on('hotkeyDeleted', () => this.updateDisplay());
    this.hotkeyManager.on('deckCreated', () => this.updateDisplay());
    this.hotkeyManager.on('deckUpdated', () => this.updateDisplay());
    this.hotkeyManager.on('deckDeleted', () => this.updateDisplay());
    this.hotkeyManager.on('subDeckSwitched', (data) => this.onSubDeckSwitched(data));
    this.hotkeyManager.on('hotkeyExecuted', (data) => this.onHotkeyExecuted(data));
    this.hotkeyManager.on('hapticFeedback', () => this.triggerHapticFeedback());
    this.hotkeyManager.on('initialized', () => this.updateDisplay());
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

  updateDisplay() {
    // Throttle updates to prevent excessive re-renders
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    this.updateTimeout = setTimeout(() => {
      this.performUpdate();
    }, 50); // 50ms throttle
  }
  
  performUpdate() {
    this.updateStats();
    
    // Load saved card size on first display
    if (this.elements.content && !this.elements.content.classList.contains('hotkey-size-small') && 
        !this.elements.content.classList.contains('hotkey-size-medium') && 
        !this.elements.content.classList.contains('hotkey-size-large')) {
      this.loadHotkeyCardSize();
    }
    
    this.renderPersistentView();
  }

  updateStats() {
    const stats = this.hotkeyManager.getStats();
    const statsElement = document.getElementById('hotkeyStats');
    if (statsElement) {
      const activeSubDecksCount = stats.activeSubDecks;
      statsElement.innerHTML = `
        <span class="stat-item">${stats.totalHotkeys} Hotkeys</span>
        <span class="stat-item">${stats.mainDecks} Hauptdecks</span>
        <span class="stat-item">${stats.subDecks} Unterdecks</span>
        ${activeSubDecksCount > 0 ? `<span class="stat-item active-indicator">${activeSubDecksCount} aktiv</span>` : ''}
      `;
    }
  }

  // ===== PERSISTENTE ANSICHT - HAUPTFUNKTION =====

  renderPersistentView() {
    if (!this.elements.content) return;

    const standaloneHotkeys = this.hotkeyManager.getStandaloneHotkeys();
    const mainDecks = this.hotkeyManager.getMainDecks();
    const activeSubDecks = this.hotkeyManager.getActiveSubDecks();

    let html = '';

    // Standalone hotkeys section (always visible)
    if (standaloneHotkeys.length > 0) {
      html += `
        <div class="hotkey-section standalone-hotkeys-section">
          <div class="section-header-mini">
            <h3 class="section-title">🎹 Einzelne Hotkeys</h3>
            <div class="section-actions">
              <button class="mini-action-btn" onclick="window.hotkeyUIManager.showCreateHotkeyDialog()" title="Hotkey hinzufügen">➕</button>
            </div>
          </div>
          <div class="hotkey-grid standalone-grid">
            ${standaloneHotkeys.map(hotkey => this.renderHotkeyCard(hotkey)).join('')}
          </div>
        </div>
      `;
    }

    // All main decks (always visible, showing current sub-deck or main deck content)
    mainDecks.forEach(mainDeck => {
      const activeSubDeckId = activeSubDecks[mainDeck.id];
      const currentDeck = activeSubDeckId ? this.hotkeyManager.getDeckById(activeSubDeckId) : mainDeck;
      const deckHotkeys = this.hotkeyManager.getHotkeysByDeck(currentDeck.id);
      const subDecks = this.hotkeyManager.getSubDecks(mainDeck.id);
      const isShowingSubDeck = !!activeSubDeckId;

      html += `
        <div class="main-deck-section ${isShowingSubDeck ? 'showing-subdeck' : ''}" data-main-deck-id="${mainDeck.id}">
          <div class="deck-header">
            <div class="deck-title-area">
              <h3 class="deck-title">
                <span class="deck-icon">🎛️</span>
                ${mainDeck.name}
                <span class="deck-size-info">(${mainDeck.rows}×${mainDeck.columns})</span>
              </h3>
              ${isShowingSubDeck ? `
                <div class="active-subdeck-indicator">
                  <span class="subdeck-icon">📁</span>
                  <span class="subdeck-name">${currentDeck.name}</span>
                  <button class="back-to-main-btn" onclick="window.hotkeyUIManager.switchBackToMainDeck('${mainDeck.id}')" title="Zurück zum Hauptdeck">↩️</button>
                </div>
              ` : ''}
            </div>
            <div class="deck-actions">
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.createHotkeyForDeck('${currentDeck.id}')" title="Hotkey für dieses Deck erstellen">➕</button>
              ${!isShowingSubDeck && subDecks.length > 0 ? `
                <div class="subdeck-switcher">
                  <button class="deck-action-btn dropdown-toggle" onclick="window.hotkeyUIManager.toggleSubDeckMenu('${mainDeck.id}')" title="Unterdecks">📁</button>
                  <div class="subdeck-menu" id="subdeck-menu-${mainDeck.id}" style="display: none;">
                    ${subDecks.map(subDeck => `
                      <button class="subdeck-menu-item" onclick="window.hotkeyUIManager.switchToSubDeck('${mainDeck.id}', '${subDeck.id}')">
                        📁 ${subDeck.name}
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${!isShowingSubDeck ? `<button class="deck-action-btn" onclick="window.hotkeyUIManager.createSubDeck('${mainDeck.id}')" title="Unterdeck erstellen">📁➕</button>` : ''}
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.editDeck('${currentDeck.id}')" title="Deck bearbeiten">✏️</button>
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.learnDeckHotkeys('${currentDeck.id}')" title="Deck-Hotkeys lernen">🎓</button>
            </div>
          </div>
          
          <div class="deck-grid-container">
            <div class="deck-grid" style="grid-template-columns: repeat(${currentDeck.columns}, 1fr); grid-template-rows: repeat(${currentDeck.rows}, 1fr);">
              ${this.renderDeckGrid(currentDeck, deckHotkeys)}
            </div>
          </div>

          ${!isShowingSubDeck && subDecks.length > 0 ? `
            <div class="subdeck-quick-access">
              <div class="subdeck-chips">
                ${subDecks.map(subDeck => `
                  <button class="subdeck-chip" onclick="window.hotkeyUIManager.switchToSubDeck('${mainDeck.id}', '${subDeck.id}')" title="Zu ${subDeck.name} wechseln">
                    📁 ${subDeck.name}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });

    // Empty state if no content
    if (standaloneHotkeys.length === 0 && mainDecks.length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-icon">🎛️</div>
          <h3>Keine Hotkeys oder Decks vorhanden</h3>
          <p>Erstelle deinen ersten Hotkey oder dein erstes Deck um loszulegen</p>
          <div class="empty-actions">
            <button class="btn-primary" onclick="window.hotkeyUIManager.showCreateHotkeyDialog()">🎹 Hotkey erstellen</button>
            <button class="btn-secondary" onclick="window.hotkeyUIManager.showCreateDeckDialog()">🎛️ Deck erstellen</button>
          </div>
        </div>
      `;
    }

    this.elements.content.innerHTML = html;
    
    // Setup click-outside listeners for dropdown menus
    this.setupDropdownListeners();
  }

  setupDropdownListeners() {
    // Close dropdown menus when clicking outside
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.subdeck-switcher')) {
        const openMenus = document.querySelectorAll('.subdeck-menu[style*="block"]');
        openMenus.forEach(menu => menu.style.display = 'none');
      }
    });
  }

  toggleSubDeckMenu(mainDeckId) {
    const menu = document.getElementById(`subdeck-menu-${mainDeckId}`);
    if (!menu) return;

    // Close other open menus
    const otherMenus = document.querySelectorAll('.subdeck-menu');
    otherMenus.forEach(m => {
      if (m !== menu) {
        m.style.display = 'none';
      }
    });

    // Toggle this menu
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
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
      
      const hotkey = deckHotkeys.find(h => 
        h.position && h.position.row === row && h.position.col === col
      );

      if (hotkey) {
        html += `
          <div class="deck-slot occupied ${hotkey.enabled ? '' : 'disabled'}" 
               data-position="${row},${col}"
               data-hotkey-id="${hotkey.id}"
               onclick="window.hotkeyUIManager.handleCardClick(event, '${hotkey.id}')"
               oncontextmenu="window.hotkeyUIManager.handleCardRightClick(event, '${hotkey.id}')">
            <div class="slot-content">
              <div class="slot-name">${hotkey.name}</div>
              <div class="slot-trigger">${this.getShortTriggerText(hotkey.triggers[0])}</div>
              <div class="slot-actions-count">${hotkey.actions.length} A</div>
            </div>
            <div class="slot-status">
              <span class="status-indicator ${hotkey.enabled ? 'enabled' : 'disabled'}"></span>
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
              <span class="position-indicator">${row + 1},${col + 1}</span>
            </div>
          </div>
        `;
      }
    }

    return html;
  }

  // ===== SUB-DECK SWITCHING METHODS =====

  switchToSubDeck(mainDeckId, subDeckId) {
    const success = this.hotkeyManager.switchToSubDeck(mainDeckId, subDeckId);
    if (success) {
      const subDeck = this.hotkeyManager.getDeckById(subDeckId);
      this.uiManager.showSuccessMessage(`Unter-Deck "${subDeck.name}" aktiviert!`);
      
      // Close the dropdown menu
      const menu = document.getElementById(`subdeck-menu-${mainDeckId}`);
      if (menu) menu.style.display = 'none';
    }
  }

  switchBackToMainDeck(mainDeckId) {
    const success = this.hotkeyManager.switchBackToMainDeck(mainDeckId);
    if (success) {
      const mainDeck = this.hotkeyManager.getDeckById(mainDeckId);
      this.uiManager.showSuccessMessage(`Zurück zu Haupt-Deck "${mainDeck.name}"`);
    }
  }

  // ===== CARD INTERACTION HANDLERS =====

  handleCardClick(event, hotkeyId) {
    event.preventDefault();
    event.stopPropagation();
    
    // Visual feedback for this specific card only
    const card = event.currentTarget;
    
    // Prevent multiple simultaneous animations
    if (card.classList.contains('executing')) {
      return;
    }
    
    // Add bounce animation only to this card
    card.classList.add('executing');
    
    // Execute the hotkey
    this.executeHotkey(hotkeyId);
    
    // Remove animation after completion
    setTimeout(() => {
      card.classList.remove('executing');
    }, 500);
    
    // Show execution feedback
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (hotkey && window.uiManager && window.uiManager.showHotkeyExecutionFeedback) {
      window.uiManager.showHotkeyExecutionFeedback(hotkey.name);
    }
  }

  handleCardRightClick(event, hotkeyId) {
    event.preventDefault();
    event.stopPropagation();
    
    // Right click shows context popup
    this.showHotkeyContextPopup(event, hotkeyId);
  }

  // ===== HOTKEY CONTEXT POPUP =====

  showHotkeyContextPopup(event, hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    // Remove existing popups
    const existingPopup = document.querySelector('.hotkey-context-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.className = 'hotkey-context-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <h4>${hotkey.name}</h4>
        <button class="popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="popup-content">
        <div class="popup-section">
          <div class="popup-actions">
            <button class="popup-btn primary" onclick="window.hotkeyUIManager.executeHotkey('${hotkeyId}'); this.closest('.hotkey-context-popup').remove();">
              ▶️ Ausführen
            </button>
            <button class="popup-btn" onclick="window.hotkeyUIManager.editHotkeyPopup('${hotkeyId}')">
              ✏️ Bearbeiten
            </button>
            <button class="popup-btn" onclick="window.hotkeyUIManager.duplicateHotkey('${hotkeyId}'); this.closest('.hotkey-context-popup').remove();">
              📋 Duplizieren
            </button>
          </div>
        </div>
        <div class="popup-section">
          <h5>Status</h5>
          <div class="status-toggle">
            <label class="toggle-switch">
              <input type="checkbox" ${hotkey.enabled ? 'checked' : ''} onchange="window.hotkeyUIManager.toggleHotkey('${hotkeyId}')">
              <span class="toggle-slider"></span>
              <span class="toggle-label">${hotkey.enabled ? 'Aktiviert' : 'Deaktiviert'}</span>
            </label>
          </div>
        </div>
        <div class="popup-section">
          <h5>Trigger (${hotkey.triggers.length})</h5>
          <div class="trigger-list">
            ${hotkey.triggers.length === 0 ? 
              '<p class="empty-text">Keine Trigger</p>' :
              hotkey.triggers.map(trigger => `
                <div class="trigger-chip">
                  <span class="trigger-icon">${trigger.type === 'midi' ? '🎹' : trigger.type === 'keyboard' ? '⌨️' : '🖱️'}</span>
                  <span class="trigger-desc">${trigger.data.description}</span>
                </div>
              `).join('')
            }
          </div>
        </div>
        <div class="popup-section">
          <h5>Aktionen (${hotkey.actions.length})</h5>
          <div class="action-list">
            ${hotkey.actions.length === 0 ? 
              '<p class="empty-text">Keine Aktionen</p>' :
              hotkey.actions.map((action, index) => `
                <div class="action-chip">
                  <span class="action-order">${index + 1}.</span>
                  <span class="action-desc">${this.getActionDisplayText(action)}</span>
                </div>
              `).join('')
            }
          </div>
        </div>
        <div class="popup-section danger">
          <button class="popup-btn danger" onclick="if(confirm('Hotkey wirklich löschen?')) { window.hotkeyUIManager.deleteHotkey('${hotkeyId}'); this.closest('.hotkey-context-popup').remove(); }">
            🗑️ Löschen
          </button>
        </div>
      </div>
    `;

    // Smart positioning
    const rect = event.currentTarget.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = `${rect.right + 10}px`;
    popup.style.top = `${rect.top}px`;
    popup.style.zIndex = '10000';
    
    document.body.appendChild(popup);

    // Close on outside click
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  // ===== HOTKEY ACTIONS =====

  executeHotkey(hotkeyId) {
    this.hotkeyManager.executeHotkey(hotkeyId);
  }

  editHotkeyPopup(hotkeyId) {
    // Close the context popup first
    const popup = document.querySelector('.hotkey-context-popup');
    if (popup) popup.remove();
    
    // Show the modern edit dialog
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (hotkey && window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showHotkeyEditDialog(hotkey);
    }
  }

  toggleHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    this.hotkeyManager.updateHotkey(hotkeyId, { enabled: !hotkey.enabled });
    this.uiManager.showSuccessMessage(`Hotkey ${hotkey.enabled ? 'deaktiviert' : 'aktiviert'}`);
  }

  deleteHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    if (confirm(`Hotkey "${hotkey.name}" wirklich löschen?`)) {
      this.hotkeyManager.deleteHotkey(hotkeyId);
      this.uiManager.showSuccessMessage('Hotkey gelöscht');
    }
  }

  duplicateHotkey(hotkeyId) {
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    if (!hotkey) return;

    const newHotkey = this.hotkeyManager.createHotkey({
      name: `${hotkey.name} (Kopie)`,
      description: hotkey.description,
      deckId: hotkey.deckId,
      position: null
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

  createHotkeyForSlot(deckId, row, col) {
    this.showCreateHotkeyDialog({
      deckId: deckId,
      position: { row, col }
    });
  }

  createHotkeyForDeck(deckId) {
    this.showCreateHotkeyDialog({
      deckId: deckId
    });
  }

  // ===== DECK ACTIONS =====

  createSubDeck(parentDeckId) {
    const parentDeck = this.hotkeyManager.getDeckById(parentDeckId);
    if (!parentDeck) return;

    this.showSimpleInputDialog(
      `Name für das Unterdeck von "${parentDeck.name}":`,
      '',
      (subDeckName) => {
        if (!subDeckName || !subDeckName.trim()) return;

        const subDeck = this.hotkeyManager.createSubDeck(parentDeckId, {
          name: subDeckName.trim(),
          description: `Unterdeck von ${parentDeck.name}`
        });

        this.uiManager.showSuccessMessage(`Unterdeck "${subDeckName}" erstellt!`);
      }
    );
  }

  // ===== SIMPLE INPUT DIALOG =====

  showSimpleInputDialog(title, defaultValue = '', onConfirm) {
    // Remove existing dialog
    const existingDialog = document.querySelector('.simple-input-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.className = 'simple-input-dialog';
    dialog.innerHTML = `
      <div class="simple-input-content">
        <h3>${title}</h3>
        <input type="text" id="simpleInput" value="${defaultValue}" placeholder="Name eingeben...">
        <div class="simple-input-buttons">
          <button class="cancel">Abbrechen</button>
          <button class="confirm">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const input = dialog.querySelector('#simpleInput');
    const cancelBtn = dialog.querySelector('.cancel');
    const confirmBtn = dialog.querySelector('.confirm');

    // Focus and select input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

    // Event handlers
    const handleConfirm = () => {
      const value = input.value.trim();
      if (value) {
        onConfirm(value);
      }
      dialog.remove();
    };

    const handleCancel = () => {
      dialog.remove();
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    // Enter key confirmation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });

    // Click outside to cancel
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        handleCancel();
      }
    });
  }

  editDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showDeckEditDialog(deck);
    }
  }

  learnDeckHotkeys(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    if (window.hotkeyDialogManager) {
      window.hotkeyDialogManager.showDeckLearningDialog(deck);
    }
  }

  deleteDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    if (confirm(`Deck "${deck.name}" und alle zugehörigen Hotkeys wirklich löschen?`)) {
      this.hotkeyManager.deleteDeck(deckId);
      this.uiManager.showSuccessMessage('Deck gelöscht');
    }
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

  getActionDisplayText(action) {
    switch (action.type) {
      case 'obs_scene_switch':
        return `Szene wechseln: ${action.data.sceneName}`;
      case 'obs_source_visibility':
        return `Source ${action.data.visible ? 'einblenden' : 'ausblenden'}: ${action.data.sourceName}`;
      case 'obs_raw_request':
        return `OBS Request: ${action.data.requestType}`;
      case 'sub_deck_switch':
        if (action.data.subDeckId) {
          const subDeck = this.hotkeyManager.getDeckById(action.data.subDeckId);
          const mainDeck = this.hotkeyManager.getDeckById(action.data.mainDeckId);
          return `Zu Unter-Deck wechseln: ${subDeck?.name || 'Unbekannt'} (${mainDeck?.name || 'Unbekannt'})`;
        } else {
          const mainDeck = this.hotkeyManager.getDeckById(action.data.mainDeckId);
          return `Zurück zu Haupt-Deck: ${mainDeck?.name || 'Unbekannt'}`;
        }
      case 'deck_switch':
        const deck = this.hotkeyManager.getDeckById(action.data.deckId);
        return `Deck wechseln: ${deck?.name || 'Unbekannt'}`;
      case 'audio_volume':
        return `Lautstärke: ${action.data.sourceName} → ${Math.round(action.data.volume * 100)}%`;
      case 'audio_mute':
        return `${action.data.muted ? 'Stumm' : 'Laut'}: ${action.data.sourceName}`;
      case 'obs_recording_toggle':
        return 'Aufnahme umschalten';
      case 'obs_streaming_toggle':
        return 'Stream umschalten';
      case 'delay':
        return `Verzögerung: ${action.data.duration}ms`;
      default:
        return action.type;
    }
  }

  // ===== EVENT HANDLERS =====

  onSubDeckSwitched(data) {
    console.log('HotkeyUIManager: Sub-deck switched event received:', data);
    
    // Force immediate display update for the affected main deck only
    this.performUpdate();
    
    // Visual feedback
    this.triggerHapticFeedback();
  }

  onHotkeyExecuted(data) {
    if (data.success) {
      // Find and animate the specific hotkey card if visible
      const hotkeyCard = document.querySelector(`[data-hotkey-id="${data.hotkey.id}"]`);
      if (hotkeyCard && !hotkeyCard.classList.contains('executing')) {
        hotkeyCard.classList.add('executing');
        setTimeout(() => {
          hotkeyCard.classList.remove('executing');
        }, 500);
      }
      
      this.triggerHapticFeedback();
    }
    
    // Update last triggered time in UI
    this.updateDisplay();
  }

  triggerHapticFeedback() {
    // Vibration for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([30, 10, 30]);
    }
    
    // Audio feedback (optional - very short beep)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio feedback not available, silent fallback
    }
  }

  // ===== DIALOG METHODS =====

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

  // ===== CLEANUP =====

  destroy() {
    // Clear timeouts
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    // Remove event listeners and cleanup
    console.log('HotkeyUIManager: Cleaning up...');
  }
}

// Export for global access
console.log('HotkeyUIManager: Persistent deck view UI system loaded');
window.HotkeyUIManager = HotkeyUIManager;