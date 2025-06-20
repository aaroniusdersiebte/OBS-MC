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
              <button class="deck-action-btn" onclick="window.hotkeyUIManager.createSubDeck('${deck.id}')" title="Unterdeck erstellen">📁➕</button>
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
          <div class="deck-slot occupied" 
               data-position="${row},${col}"
               data-hotkey-id="${hotkey.id}"
               onclick="window.hotkeyUIManager.handleCardClick(event, '${hotkey.id}')"
               oncontextmenu="window.hotkeyUIManager.handleCardRightClick(event, '${hotkey.id}')">
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

  // NEW: Show hotkey context as popup
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
    
    // Show the modern edit dialog (same as create)
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

  // ===== DECK ACTIONS =====

  createSubDeck(parentDeckId) {
    const parentDeck = this.hotkeyManager.getDeckById(parentDeckId);
    if (!parentDeck) return;

    const subDeckName = prompt(`Name für das Unterdeck von "${parentDeck.name}":`);
    if (!subDeckName) return;

    const subDeck = this.hotkeyManager.createDeck({
      name: subDeckName,
      description: `Unterdeck von ${parentDeck.name}`,
      rows: parentDeck.rows,
      columns: parentDeck.columns,
      parentDeckId: parentDeckId
    });

    this.uiManager.showSuccessMessage(`Unterdeck "${subDeckName}" erstellt!`);
  }

  switchToDeck(deckId) {
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (!deck) return;

    this.hotkeyManager.switchToDeck(deckId);
    
    // Visual update for deck switching
    this.updateDisplay();
    
    const deckType = deck.isSubDeck ? 'Unter-Deck' : 'Haupt-Deck';
    this.uiManager.showSuccessMessage(`${deckType} "${deck.name}" aktiviert!`);
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

  onDeckSwitched(deck) {
    this.updateDisplay();
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

  renderDecksView() {
    // Implementation for deck view (simplified for now)
    this.elements.content.innerHTML = '<p>Deck-Ansicht wird implementiert...</p>';
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
console.log('HotkeyUIManager: Enhanced UI system loaded');
window.HotkeyUIManager = HotkeyUIManager;