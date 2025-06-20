// Hotkey Dialog Manager - Dialoge für Hotkey-Erstellung und -Bearbeitung
class HotkeyDialogManager {
  constructor(hotkeyManager, hotkeyUIManager, uiManager) {
    this.hotkeyManager = hotkeyManager;
    this.hotkeyUIManager = hotkeyUIManager;
    this.uiManager = uiManager;
    this.currentDialog = null;
    this.learningState = null;
    
    console.log('HotkeyDialogManager: Initializing dialog system...');
  }

  // ===== CREATE HOTKEY DIALOG =====

  showCreateHotkeyDialog(options = {}) {
    const dialog = this.createDialog('create-hotkey', 'Hotkey erstellen', `
      <form class="hotkey-form" id="hotkeyForm">
        <div class="form-section">
          <h4>Grundinformationen</h4>
          <div class="form-group">
            <label for="hotkeyName">Name:</label>
            <input type="text" id="hotkeyName" name="name" placeholder="Mein Hotkey" required>
          </div>
          <div class="form-group">
            <label for="hotkeyDescription">Beschreibung:</label>
            <textarea id="hotkeyDescription" name="description" placeholder="Optionale Beschreibung"></textarea>
          </div>
          ${options.deckId ? `
            <div class="form-group">
              <label>Deck:</label>
              <span class="deck-info">${this.hotkeyManager.getDeckById(options.deckId)?.name || 'Unbekannt'}</span>
              ${options.position ? `<span class="position-info">Position: ${options.position.row + 1}, ${options.position.col + 1}</span>` : ''}
            </div>
          ` : `
            <div class="form-group">
              <label for="hotkeyDeck">Zu Deck hinzufügen:</label>
              <select id="hotkeyDeck" name="deckId">
                <option value="">Einzelner Hotkey</option>
                ${this.hotkeyManager.getAllDecks().map(deck => 
                  `<option value="${deck.id}">${deck.name} (${deck.rows}×${deck.columns})</option>`
                ).join('')}
              </select>
            </div>
          `}
        </div>

        <div class="form-section">
          <h4>Trigger</h4>
          <div class="trigger-section" id="triggerSection">
            <div class="trigger-options">
              <button type="button" class="trigger-btn" data-type="midi" title="MIDI-Controller lernen">🎹 MIDI</button>
              <button type="button" class="trigger-btn" data-type="keyboard" title="Tastatur-Shortcut lernen">⌨️ Tastatur</button>
              <button type="button" class="trigger-btn" data-type="click" title="Nur per Klick">🖱️ Klick</button>
            </div>
            <div class="learned-triggers" id="learnedTriggers"></div>
          </div>
        </div>

        <div class="form-section">
          <h4>Aktionen</h4>
          <div class="actions-section" id="actionsSection">
            <div class="actions-list" id="actionsList"></div>
            <div class="add-action-section">
              <select id="actionType">
                <option value="">Aktion auswählen...</option>
                <optgroup label="OBS Studio">
                  <option value="obs_scene_switch">Szene wechseln</option>
                  <option value="obs_source_visibility">Source Ein-/Ausblenden</option>
                  <option value="obs_filter_toggle">Filter umschalten</option>
                  <option value="obs_recording_toggle">Aufnahme umschalten</option>
                  <option value="obs_streaming_toggle">Stream umschalten</option>
                  <option value="obs_raw_request">Raw OBS Request</option>
                </optgroup>
                <optgroup label="Audio">
                  <option value="audio_volume">Lautstärke setzen</option>
                  <option value="audio_mute">Stumm schalten</option>
                </optgroup>
                <optgroup label="Deck-Steuerung">
                  <option value="deck_switch">Deck wechseln</option>
                </optgroup>
                <optgroup label="Hilfsmittel">
                  <option value="delay">Verzögerung</option>
                </optgroup>
              </select>
              <button type="button" id="addActionBtn" class="btn-secondary">+ Hinzufügen</button>
            </div>
          </div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Erstellen', action: () => this.handleCreateHotkey(options) },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupCreateHotkeyEventListeners();
  }

  setupCreateHotkeyEventListeners() {
    // Trigger learning buttons
    const triggerBtns = this.currentDialog.querySelectorAll('.trigger-btn');
    triggerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.startTriggerLearning(type);
      });
    });

    // Add action button
    const addActionBtn = this.currentDialog.querySelector('#addActionBtn');
    const actionType = this.currentDialog.querySelector('#actionType');
    
    addActionBtn?.addEventListener('click', () => {
      const type = actionType.value;
      if (type) {
        this.addActionToForm(type);
        actionType.value = '';
      }
    });
  }

  startTriggerLearning(type) {
    this.learningState = { type, dialog: this.currentDialog };

    const triggerSection = this.currentDialog.querySelector('#triggerSection');
    triggerSection.innerHTML = `
      <div class="learning-state">
        <div class="learning-indicator">
          <div class="learning-animation">${type === 'midi' ? '🎹' : '⌨️'}</div>
          <h4>Learning ${type === 'midi' ? 'MIDI' : 'Keyboard'}</h4>
          <p>${type === 'midi' ? 
            'Bewege einen Regler oder drücke einen Button auf deinem MIDI-Controller' : 
            'Drücke die gewünschte Tastenkombination'
          }</p>
          <button type="button" class="btn-secondary" onclick="window.hotkeyDialogManager.cancelTriggerLearning()">Abbrechen</button>
        </div>
      </div>
    `;

    if (type === 'midi') {
      this.hotkeyManager.startLearningMode((trigger) => {
        this.onTriggerLearned(trigger);
      });
    } else if (type === 'keyboard') {
      this.startKeyboardLearning();
    } else if (type === 'click') {
      // For click, just add it directly
      this.onTriggerLearned({ type: 'click', data: { description: 'Per Klick' } });
    }
  }

  startKeyboardLearning() {
    const handleKeyPress = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const trigger = {
        type: 'keyboard',
        data: {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          description: this.hotkeyManager.getKeyboardDescription(event)
        }
      };

      document.removeEventListener('keydown', handleKeyPress);
      this.onTriggerLearned(trigger);
    };

    document.addEventListener('keydown', handleKeyPress);
  }

  onTriggerLearned(trigger) {
    if (!this.learningState || !this.learningState.dialog) return;

    const triggerSection = this.learningState.dialog.querySelector('#triggerSection');
    const learnedTriggersContainer = document.createElement('div');
    learnedTriggersContainer.className = 'learned-triggers';
    learnedTriggersContainer.id = 'learnedTriggers';

    triggerSection.innerHTML = `
      <div class="trigger-options">
        <button type="button" class="trigger-btn" data-type="midi" title="MIDI-Controller lernen">🎹 MIDI</button>
        <button type="button" class="trigger-btn" data-type="keyboard" title="Tastatur-Shortcut lernen">⌨️ Tastatur</button>
        <button type="button" class="trigger-btn" data-type="click" title="Nur per Klick">🖱️ Klick</button>
      </div>
    `;
    
    triggerSection.appendChild(learnedTriggersContainer);

    // Add learned trigger
    this.addLearnedTrigger(trigger);

    // Re-setup event listeners
    this.setupCreateHotkeyEventListeners();

    this.learningState = null;
  }

  addLearnedTrigger(trigger) {
    const container = this.currentDialog.querySelector('#learnedTriggers');
    if (!container) return;

    const triggerDiv = document.createElement('div');
    triggerDiv.className = 'learned-trigger';
    triggerDiv.innerHTML = `
      <span class="trigger-type-icon">${trigger.type === 'midi' ? '🎹' : trigger.type === 'keyboard' ? '⌨️' : '🖱️'}</span>
      <span class="trigger-description">${trigger.data.description}</span>
      <button type="button" class="remove-trigger-btn" onclick="this.parentElement.remove()">×</button>
    `;
    
    triggerDiv.dataset.trigger = JSON.stringify(trigger);
    container.appendChild(triggerDiv);
  }

  cancelTriggerLearning() {
    this.hotkeyManager.stopLearningMode();
    this.learningState = null;

    // Reset trigger section
    if (this.currentDialog) {
      const triggerSection = this.currentDialog.querySelector('#triggerSection');
      triggerSection.innerHTML = `
        <div class="trigger-options">
          <button type="button" class="trigger-btn" data-type="midi" title="MIDI-Controller lernen">🎹 MIDI</button>
          <button type="button" class="trigger-btn" data-type="keyboard" title="Tastatur-Shortcut lernen">⌨️ Tastatur</button>
          <button type="button" class="trigger-btn" data-type="click" title="Nur per Klick">🖱️ Klick</button>
        </div>
        <div class="learned-triggers" id="learnedTriggers"></div>
      `;
      this.setupCreateHotkeyEventListeners();
    }
  }

  addActionToForm(actionType) {
    const actionsList = this.currentDialog.querySelector('#actionsList');
    if (!actionsList) return;

    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-form-item';
    actionDiv.dataset.actionType = actionType;

    let configHTML = '';
    switch (actionType) {
      case 'obs_scene_switch':
        configHTML = this.getSceneSwitchConfig();
        break;
      case 'obs_source_visibility':
        configHTML = this.getSourceVisibilityConfig();
        break;
      case 'obs_filter_toggle':
        configHTML = this.getFilterToggleConfig();
        break;
      case 'obs_recording_toggle':
      case 'obs_streaming_toggle':
        configHTML = '<p>Keine weitere Konfiguration erforderlich</p>';
        break;
      case 'obs_raw_request':
        configHTML = this.getRawRequestConfig();
        break;
      case 'audio_volume':
        configHTML = this.getAudioVolumeConfig();
        break;
      case 'audio_mute':
        configHTML = this.getAudioMuteConfig();
        break;
      case 'deck_switch':
        configHTML = this.getDeckSwitchConfig();
        break;
      case 'delay':
        configHTML = this.getDelayConfig();
        break;
    }

    actionDiv.innerHTML = `
      <div class="action-header">
        <span class="action-title">${this.getActionTitle(actionType)}</span>
        <button type="button" class="remove-action-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="action-config">
        ${configHTML}
      </div>
    `;

    actionsList.appendChild(actionDiv);
  }

  getActionTitle(actionType) {
    const titles = {
      'obs_scene_switch': 'Szene wechseln',
      'obs_source_visibility': 'Source Ein-/Ausblenden',
      'obs_filter_toggle': 'Filter umschalten',
      'obs_recording_toggle': 'Aufnahme umschalten',
      'obs_streaming_toggle': 'Stream umschalten',
      'obs_raw_request': 'Raw OBS Request',
      'audio_volume': 'Lautstärke setzen',
      'audio_mute': 'Stumm schalten',
      'deck_switch': 'Deck wechseln',
      'delay': 'Verzögerung'
    };
    return titles[actionType] || actionType;
  }

  getSceneSwitchConfig() {
    // Get scenes properly from OBS manager
    let scenes = [];
    if (window.obsManager && window.obsManager.isConnected) {
      const obsScenes = window.obsManager.availableScenes || window.obsManager.scenes || [];
      // Handle different scene formats
      scenes = Array.isArray(obsScenes) ? obsScenes : [];
    }
    
    return `
      <div class="config-group">
        <label>Szene:</label>
        <select name="sceneName" required>
          <option value="">Szene auswählen...</option>
          ${scenes.map(scene => {
            const sceneName = scene.sceneName || scene.name || scene;
            return `<option value="${sceneName}">${sceneName}</option>`;
          }).join('')}
        </select>
        ${scenes.length === 0 ? '<small class="help-text">Keine Szenen gefunden. Ist OBS verbunden?</small>' : ''}
      </div>
    `;
  }

  getSourceVisibilityConfig() {
    return `
      <div class="config-group">
        <label>Scene Name:</label>
        <input type="text" name="sceneName" placeholder="Scene Name" required>
      </div>
      <div class="config-group">
        <label>Source Name:</label>
        <input type="text" name="sourceName" placeholder="Source Name" required>
      </div>
      <div class="config-group">
        <label>Aktion:</label>
        <select name="visible" required>
          <option value="true">Einblenden</option>
          <option value="false">Ausblenden</option>
        </select>
      </div>
    `;
  }

  getFilterToggleConfig() {
    return `
      <div class="config-group">
        <label>Source Name:</label>
        <input type="text" name="sourceName" placeholder="Source Name" required>
      </div>
      <div class="config-group">
        <label>Filter Name:</label>
        <input type="text" name="filterName" placeholder="Filter Name" required>
      </div>
      <div class="config-group">
        <label>Aktion:</label>
        <select name="enabled" required>
          <option value="true">Aktivieren</option>
          <option value="false">Deaktivieren</option>
        </select>
      </div>
    `;
  }

  getRawRequestConfig() {
    return `
      <div class="config-group">
        <label>Request Type:</label>
        <input type="text" name="requestType" placeholder="z.B. SetSceneItemEnabled" required>
      </div>
      <div class="config-group">
        <label>Request Data (JSON):</label>
        <textarea name="requestData" placeholder='{"sceneName": "Scene", "sceneItemId": 1, "sceneItemEnabled": true}' required></textarea>
      </div>
    `;
  }

  getAudioVolumeConfig() {
    const audioSources = window.audioManager?.getAllAudioSources() || [];
    return `
      <div class="config-group">
        <label>Audio Source:</label>
        <select name="sourceName" required>
          <option value="">Audio-Quelle auswählen...</option>
          ${audioSources.map(source => `<option value="${source.name}">${source.name}</option>`).join('')}
        </select>
      </div>
      <div class="config-group">
        <label>Lautstärke (0-100%):</label>
        <input type="number" name="volume" min="0" max="100" value="50" required>
      </div>
    `;
  }

  getAudioMuteConfig() {
    const audioSources = window.audioManager?.getAllAudioSources() || [];
    return `
      <div class="config-group">
        <label>Audio Source:</label>
        <select name="sourceName" required>
          <option value="">Audio-Quelle auswählen...</option>
          ${audioSources.map(source => `<option value="${source.name}">${source.name}</option>`).join('')}
        </select>
      </div>
      <div class="config-group">
        <label>Aktion:</label>
        <select name="muted" required>
          <option value="true">Stumm schalten</option>
          <option value="false">Laut schalten</option>
        </select>
      </div>
    `;
  }

  getDeckSwitchConfig() {
    const decks = this.hotkeyManager.getAllDecks();
    return `
      <div class="config-group">
        <label>Ziel-Deck:</label>
        <select name="deckId" required>
          <option value="">Deck auswählen...</option>
          ${decks.map(deck => `<option value="${deck.id}">${deck.name}</option>`).join('')}
        </select>
      </div>
    `;
  }

  getDelayConfig() {
    return `
      <div class="config-group">
        <label>Verzögerung (Millisekunden):</label>
        <input type="number" name="duration" min="0" max="10000" value="1000" required>
      </div>
    `;
  }

  handleCreateHotkey(options = {}) {
    const form = this.currentDialog.querySelector('#hotkeyForm');
    const formData = new FormData(form);

    // Get basic hotkey data
    const hotkeyData = {
      name: formData.get('name'),
      description: formData.get('description'),
      deckId: options.deckId || formData.get('deckId') || null,
      position: options.position || null
    };

    // Create hotkey
    const hotkey = this.hotkeyManager.createHotkey(hotkeyData);

    // Add triggers
    const learnedTriggers = this.currentDialog.querySelectorAll('.learned-trigger');
    learnedTriggers.forEach(triggerEl => {
      const trigger = JSON.parse(triggerEl.dataset.trigger);
      this.hotkeyManager.addTriggerToHotkey(hotkey.id, trigger);
    });

    // Add actions
    const actionItems = this.currentDialog.querySelectorAll('.action-form-item');
    actionItems.forEach(actionEl => {
      const actionType = actionEl.dataset.actionType;
      const actionConfig = this.extractActionConfig(actionEl, actionType);
      
      if (actionConfig) {
        this.hotkeyManager.addActionToHotkey(hotkey.id, {
          type: actionType,
          data: actionConfig
        });
      }
    });

    this.closeDialog();
    this.uiManager.showSuccessMessage(`Hotkey "${hotkey.name}" erstellt!`);
  }

  extractActionConfig(actionEl, actionType) {
    const inputs = actionEl.querySelectorAll('input, select, textarea');
    const config = {};

    inputs.forEach(input => {
      const name = input.name;
      let value = input.value;

      // Skip empty values
      if (!name || value === '') return;

      // Type conversion
      if (input.type === 'number') {
        value = parseFloat(value);
        if (name === 'volume') value = value / 100; // Convert percentage to 0-1
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (name === 'requestData') {
        // Only try to parse JSON if there's actually content
        if (value.trim()) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.error('Invalid JSON in request data:', value);
            return; // Skip this field if JSON is invalid
          }
        } else {
          value = {}; // Default empty object for raw requests
        }
      }

      config[name] = value;
    });

    return Object.keys(config).length > 0 ? config : null;
  }

  // ===== CREATE DECK DIALOG =====

  showCreateDeckDialog() {
    const dialog = this.createDialog('create-deck', 'Deck erstellen', `
      <form class="deck-form" id="deckForm">
        <div class="form-section">
          <h4>Grundinformationen</h4>
          <div class="form-group">
            <label for="deckName">Name:</label>
            <input type="text" id="deckName" name="name" placeholder="Mein Deck" required>
          </div>
          <div class="form-group">
            <label for="deckDescription">Beschreibung:</label>
            <textarea id="deckDescription" name="description" placeholder="Optionale Beschreibung"></textarea>
          </div>
        </div>

        <div class="form-section">
          <h4>Layout</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="deckRows">Reihen:</label>
              <input type="number" id="deckRows" name="rows" min="1" max="8" value="4" required>
            </div>
            <div class="form-group">
              <label for="deckColumns">Spalten:</label>
              <input type="number" id="deckColumns" name="columns" min="1" max="8" value="4" required>
            </div>
          </div>
          <div class="deck-preview" id="deckPreview">
            <!-- Preview will be generated here -->
          </div>
        </div>

        <div class="form-section">
          <h4>Deck-Typ</h4>
          <div class="form-group">
            <label for="deckParent">Übergeordnetes Deck:</label>
            <select id="deckParent" name="parentDeckId">
              <option value="">Haupt-Deck</option>
              ${this.hotkeyManager.getMainDecks().map(deck => 
                `<option value="${deck.id}">${deck.name} (Unter-Deck)</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Erstellen', action: () => this.handleCreateDeck() },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupDeckPreview();
  }

  setupDeckPreview() {
    const rowsInput = this.currentDialog.querySelector('#deckRows');
    const columnsInput = this.currentDialog.querySelector('#deckColumns');
    const preview = this.currentDialog.querySelector('#deckPreview');

    const updatePreview = () => {
      const rows = parseInt(rowsInput.value) || 4;
      const columns = parseInt(columnsInput.value) || 4;
      
      preview.innerHTML = `
        <div class="preview-grid" style="grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
          ${Array(rows * columns).fill(0).map((_, i) => `
            <div class="preview-slot">
              <span class="slot-number">${i + 1}</span>
            </div>
          `).join('')}
        </div>
        <div class="preview-info">
          ${rows} × ${columns} = ${rows * columns} Hotkey-Plätze
        </div>
      `;
    };

    rowsInput.addEventListener('input', updatePreview);
    columnsInput.addEventListener('input', updatePreview);
    updatePreview();
  }

  handleCreateDeck() {
    const form = this.currentDialog.querySelector('#deckForm');
    const formData = new FormData(form);

    const deckData = {
      name: formData.get('name'),
      description: formData.get('description'),
      rows: parseInt(formData.get('rows')),
      columns: parseInt(formData.get('columns')),
      parentDeckId: formData.get('parentDeckId') || null
    };

    const deck = this.hotkeyManager.createDeck(deckData);
    
    this.closeDialog();
    this.uiManager.showSuccessMessage(`Deck "${deck.name}" erstellt!`);
  }

  // ===== QUICK LEARNING DIALOG =====

  startQuickLearning() {
    const dialog = this.createDialog('quick-learning', 'Schnelles Hotkey-Lernen', `
      <div class="quick-learning-content">
        <div class="learning-steps">
          <h4>Anleitung:</h4>
          <ol>
            <li>Wähle eine Aktion aus der Liste</li>
            <li>Drücke den entsprechenden Button/Regler auf deinem MIDI-Controller</li>
            <li>Der Hotkey wird automatisch erstellt und zugeordnet</li>
          </ol>
        </div>

        <div class="quick-actions">
          <h4>Verfügbare Aktionen:</h4>
          <div class="quick-action-grid">
            ${this.getQuickActionButtons()}
          </div>
        </div>

        <div class="learning-status" id="learningStatus" style="display: none;">
          <div class="status-content">
            <div class="learning-animation">🎹</div>
            <h4>Warte auf MIDI-Input...</h4>
            <p class="learning-action" id="learningAction"></p>
            <button type="button" class="btn-secondary" onclick="window.hotkeyDialogManager.cancelQuickLearning()">Abbrechen</button>
          </div>
        </div>
      </div>
    `, {
      secondaryButton: { text: 'Schließen', action: () => this.closeDialog() }
    });

    this.setupQuickLearningEvents();
  }

  getQuickActionButtons() {
    const quickActions = [
      { type: 'obs_recording_toggle', title: 'Aufnahme umschalten', icon: '🔴' },
      { type: 'obs_streaming_toggle', title: 'Stream umschalten', icon: '📺' },
    ];

    // Add scene switch actions
    const scenes = window.obsManager?.getScenes() || [];
    scenes.slice(0, 6).forEach(scene => {
      quickActions.push({
        type: 'obs_scene_switch',
        title: `Szene: ${scene.sceneName}`,
        icon: '🎬',
        data: { sceneName: scene.sceneName }
      });
    });

    // Add audio mute actions
    const audioSources = window.audioManager?.getAllAudioSources() || [];
    audioSources.slice(0, 4).forEach(source => {
      quickActions.push({
        type: 'audio_mute',
        title: `Mute: ${source.name}`,
        icon: '🔇',
        data: { sourceName: source.name, muted: true }
      });
    });

    return quickActions.map(action => `
      <button class="quick-action-btn" data-action='${JSON.stringify(action)}'>
        <span class="action-icon">${action.icon}</span>
        <span class="action-title">${action.title}</span>
      </button>
    `).join('');
  }

  setupQuickLearningEvents() {
    const actionBtns = this.currentDialog.querySelectorAll('.quick-action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = JSON.parse(btn.dataset.action);
        this.startQuickActionLearning(action);
      });
    });
  }

  startQuickActionLearning(action) {
    this.learningState = { action, dialog: this.currentDialog };

    // Show learning status
    const actionsGrid = this.currentDialog.querySelector('.quick-action-grid');
    const learningStatus = this.currentDialog.querySelector('#learningStatus');
    const learningAction = this.currentDialog.querySelector('#learningAction');

    actionsGrid.style.display = 'none';
    learningStatus.style.display = 'block';
    learningAction.textContent = action.title;

    // Start learning
    this.hotkeyManager.startLearningMode((trigger) => {
      this.onQuickActionLearned(trigger, action);
    });
  }

  onQuickActionLearned(trigger, action) {
    // Create hotkey
    const hotkey = this.hotkeyManager.createHotkey({
      name: action.title,
      description: `Schnell erstellter Hotkey für ${action.title}`
    });

    // Add trigger
    this.hotkeyManager.addTriggerToHotkey(hotkey.id, trigger);

    // Add action
    this.hotkeyManager.addActionToHotkey(hotkey.id, {
      type: action.type,
      data: action.data || {}
    });

    this.uiManager.showSuccessMessage(`Hotkey "${action.title}" erstellt!`);
    this.cancelQuickLearning();
  }

  cancelQuickLearning() {
    this.hotkeyManager.stopLearningMode();
    this.learningState = null;

    if (this.currentDialog) {
      const actionsGrid = this.currentDialog.querySelector('.quick-action-grid');
      const learningStatus = this.currentDialog.querySelector('#learningStatus');

      actionsGrid.style.display = 'grid';
      learningStatus.style.display = 'none';
    }
  }

  // ===== IMPORT/EXPORT DIALOG =====

  showImportExportDialog() {
    const stats = this.hotkeyManager.getStats();
    
    const dialog = this.createDialog('import-export', 'Import / Export', `
      <div class="import-export-content">
        <div class="current-config">
          <h4>Aktuelle Konfiguration:</h4>
          <div class="config-stats">
            <div class="stat-item">
              <span class="stat-number">${stats.totalHotkeys}</span>
              <span class="stat-label">Hotkeys</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${stats.totalDecks}</span>
              <span class="stat-label">Decks</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${stats.totalExecutions}</span>
              <span class="stat-label">Ausführungen</span>
            </div>
          </div>
        </div>

        <div class="export-section">
          <h4>Export:</h4>
          <p>Exportiere deine aktuelle Hotkey-Konfiguration als JSON-Datei</p>
          <button type="button" class="btn-primary" id="exportBtn">📤 Konfiguration exportieren</button>
        </div>

        <div class="import-section">
          <h4>Import:</h4>
          <p>Importiere eine zuvor exportierte Konfiguration</p>
          <div class="import-options">
            <label class="import-option">
              <input type="radio" name="importMode" value="replace" checked>
              <span>Aktuelle Konfiguration ersetzen</span>
            </label>
            <label class="import-option">
              <input type="radio" name="importMode" value="merge">
              <span>Mit aktueller Konfiguration zusammenführen</span>
            </label>
          </div>
          <div class="file-input-section">
            <input type="file" id="importFile" accept=".json" style="display: none;">
            <button type="button" class="btn-secondary" id="importBtn">📥 Datei auswählen</button>
            <span id="fileName" class="file-name"></span>
          </div>
        </div>
      </div>
    `, {
      secondaryButton: { text: 'Schließen', action: () => this.closeDialog() }
    });

    this.setupImportExportEvents();
  }

  setupImportExportEvents() {
    const exportBtn = this.currentDialog.querySelector('#exportBtn');
    const importBtn = this.currentDialog.querySelector('#importBtn');
    const importFile = this.currentDialog.querySelector('#importFile');
    const fileName = this.currentDialog.querySelector('#fileName');

    exportBtn.addEventListener('click', () => {
      this.exportConfiguration();
    });

    importBtn.addEventListener('click', () => {
      importFile.click();
    });

    importFile.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        fileName.textContent = file.name;
        this.importConfiguration(file);
      }
    });
  }

  exportConfiguration() {
    const config = this.hotkeyManager.exportConfiguration();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `obs-midi-mixer-hotkeys-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.uiManager.showSuccessMessage('Konfiguration exportiert!');
  }

  async importConfiguration(file) {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      const importMode = this.currentDialog.querySelector('input[name="importMode"]:checked').value;
      
      if (importMode === 'replace') {
        if (!confirm('Aktuelle Konfiguration wirklich ersetzen? Alle bestehenden Hotkeys und Decks gehen verloren.')) {
          return;
        }
      }

      this.hotkeyManager.importConfiguration(config);
      this.closeDialog();
      this.uiManager.showSuccessMessage(`Konfiguration ${importMode === 'replace' ? 'ersetzt' : 'zusammengeführt'}!`);

    } catch (error) {
      console.error('Import error:', error);
      this.uiManager.showErrorMessage('Import-Fehler', 'Die Datei konnte nicht importiert werden. Bitte überprüfe das Format.');
    }
  }

  // ===== DECK EDIT DIALOG =====

  showDeckEditDialog(deck) {
    const dialog = this.createDialog('edit-deck', `Deck bearbeiten: ${deck.name}`, `
      <form class="deck-form" id="editDeckForm">
        <div class="form-section">
          <h4>Grundinformationen</h4>
          <div class="form-group">
            <label for="editDeckName">Name:</label>
            <input type="text" id="editDeckName" name="name" value="${deck.name}" required>
          </div>
          <div class="form-group">
            <label for="editDeckDescription">Beschreibung:</label>
            <textarea id="editDeckDescription" name="description">${deck.description || ''}</textarea>
          </div>
        </div>

        <div class="form-section">
          <h4>Layout</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="editDeckRows">Reihen:</label>
              <input type="number" id="editDeckRows" name="rows" min="1" max="8" value="${deck.rows}" required>
            </div>
            <div class="form-group">
              <label for="editDeckColumns">Spalten:</label>
              <input type="number" id="editDeckColumns" name="columns" min="1" max="8" value="${deck.columns}" required>
            </div>
          </div>
          <div class="deck-preview" id="editDeckPreview">
            <!-- Preview will be generated here -->
          </div>
        </div>

        <div class="form-section">
          <h4>Deck-Typ</h4>
          <div class="form-group">
            <label for="editDeckParent">Übergeordnetes Deck:</label>
            <select id="editDeckParent" name="parentDeckId">
              <option value="">Haupt-Deck</option>
              ${this.hotkeyManager.getMainDecks().filter(d => d.id !== deck.id).map(d => 
                `<option value="${d.id}" ${deck.parentDeckId === d.id ? 'selected' : ''}>${d.name} (Unter-Deck)</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Speichern', action: () => this.handleEditDeck(deck.id) },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupEditDeckPreview();
  }

  setupEditDeckPreview() {
    const rowsInput = this.currentDialog.querySelector('#editDeckRows');
    const columnsInput = this.currentDialog.querySelector('#editDeckColumns');
    const preview = this.currentDialog.querySelector('#editDeckPreview');

    const updatePreview = () => {
      const rows = parseInt(rowsInput.value) || 4;
      const columns = parseInt(columnsInput.value) || 4;
      
      preview.innerHTML = `
        <div class="preview-grid" style="grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
          ${Array(rows * columns).fill(0).map((_, i) => `
            <div class="preview-slot">
              <span class="slot-number">${i + 1}</span>
            </div>
          `).join('')}
        </div>
        <div class="preview-info">
          ${rows} × ${columns} = ${rows * columns} Hotkey-Plätze
        </div>
      `;
    };

    rowsInput.addEventListener('input', updatePreview);
    columnsInput.addEventListener('input', updatePreview);
    updatePreview();
  }

  handleEditDeck(deckId) {
    const form = this.currentDialog.querySelector('#editDeckForm');
    const formData = new FormData(form);

    const deckData = {
      name: formData.get('name'),
      description: formData.get('description'),
      rows: parseInt(formData.get('rows')),
      columns: parseInt(formData.get('columns')),
      parentDeckId: formData.get('parentDeckId') || null
    };

    this.hotkeyManager.updateDeck(deckId, deckData);
    
    this.closeDialog();
    this.uiManager.showSuccessMessage('Deck aktualisiert!');
  }

  // ===== HOTKEY EDIT DIALOG =====

  showHotkeyEditDialog(hotkey) {
    const dialog = this.createDialog('edit-hotkey', `Hotkey bearbeiten: ${hotkey.name}`, `
      <form class="hotkey-form" id="editHotkeyForm">
        <div class="form-section">
          <h4>Grundinformationen</h4>
          <div class="form-group">
            <label for="editHotkeyName">Name:</label>
            <input type="text" id="editHotkeyName" name="name" value="${hotkey.name}" required>
          </div>
          <div class="form-group">
            <label for="editHotkeyDescription">Beschreibung:</label>
            <textarea id="editHotkeyDescription" name="description">${hotkey.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="editHotkeyEnabled" name="enabled" ${hotkey.enabled ? 'checked' : ''}>
              Hotkey aktiviert
            </label>
          </div>
        </div>

        <div class="form-section">
          <h4>Trigger</h4>
          <div class="existing-triggers">
            ${hotkey.triggers.map(trigger => `
              <div class="trigger-item-edit">
                <span class="trigger-type-icon">${trigger.type === 'midi' ? '🎹' : trigger.type === 'keyboard' ? '⌨️' : '🖱️'}</span>
                <span class="trigger-description">${trigger.data.description}</span>
                <button type="button" class="remove-trigger-btn" onclick="this.parentElement.remove()">×</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="add-trigger-btn btn-secondary">+ Trigger hinzufügen</button>
        </div>

        <div class="form-section">
          <h4>Aktionen</h4>
          <div class="existing-actions">
            ${hotkey.actions.map((action, index) => `
              <div class="action-item-edit" data-action-id="${action.id}">
                <span class="action-order">${index + 1}.</span>
                <span class="action-description">${this.getActionDisplayText(action)}</span>
                <button type="button" class="remove-action-btn" onclick="this.parentElement.remove()">×</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="add-action-btn btn-secondary">+ Aktion hinzufügen</button>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Speichern', action: () => this.handleEditHotkey(hotkey.id) },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });
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

  handleEditHotkey(hotkeyId) {
    const form = this.currentDialog.querySelector('#editHotkeyForm');
    const formData = new FormData(form);

    const hotkeyData = {
      name: formData.get('name'),
      description: formData.get('description'),
      enabled: formData.get('enabled') === 'on'
    };

    this.hotkeyManager.updateHotkey(hotkeyId, hotkeyData);
    
    this.closeDialog();
    this.uiManager.showSuccessMessage('Hotkey aktualisiert!');
  }

  showDeckLearningDialog(deck) {
    const dialog = this.createDialog('deck-learning', `Deck lernen: ${deck.name}`, `
      <div class="deck-learning-content">
        <div class="deck-info">
          <h4>Deck: ${deck.name}</h4>
          <p>Layout: ${deck.rows} × ${deck.columns} (${deck.rows * deck.columns} Plätze)</p>
          ${deck.description ? `<p class="deck-description">${deck.description}</p>` : ''}
        </div>

        <div class="learning-instructions">
          <h4>Anleitung:</h4>
          <ol>
            <li>Klicke auf "Lernen starten"</li>
            <li>Drücke nacheinander die Buttons/Regler auf deinem MIDI-Controller</li>
            <li>Die Hotkeys werden automatisch den Deck-Positionen zugeordnet</li>
            <li>Leer gelassene Positionen können später einzeln belegt werden</li>
          </ol>
        </div>

        <div class="deck-preview-learning">
          <div class="preview-grid" style="grid-template-columns: repeat(${deck.columns}, 1fr);">
            ${this.renderDeckLearningPreview(deck)}
          </div>
        </div>

        <div class="learning-controls">
          <button type="button" class="btn-primary" id="startDeckLearning">🎓 Lernen starten</button>
          <button type="button" class="btn-secondary" id="skipPosition" style="display: none;">⏭️ Position überspringen</button>
          <button type="button" class="btn-secondary" id="resetDeckLearning">🔄 Zurücksetzen</button>
        </div>

        <div class="learning-progress" id="learningProgress" style="display: none;">
          <div class="progress-info">
            <span id="currentPosition">Position 1,1</span>
            <span id="progressText">0 / ${deck.rows * deck.columns}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
        </div>
      </div>
    `, {
      secondaryButton: { text: 'Schließen', action: () => this.closeDialog() }
    });

    this.setupDeckLearningEvents(deck);
  }

  renderDeckLearningPreview(deck) {
    const totalSlots = deck.rows * deck.columns;
    let html = '';

    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / deck.columns);
      const col = i % deck.columns;
      
      html += `
        <div class="learning-slot" data-position="${row},${col}" data-index="${i}">
          <span class="slot-position">${row + 1},${col + 1}</span>
          <div class="slot-status">⏳</div>
        </div>
      `;
    }

    return html;
  }

  setupDeckLearningEvents(deck) {
    const startBtn = this.currentDialog.querySelector('#startDeckLearning');
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const resetBtn = this.currentDialog.querySelector('#resetDeckLearning');

    startBtn.addEventListener('click', () => {
      this.startDeckLearning(deck);
    });

    skipBtn.addEventListener('click', () => {
      this.skipCurrentPosition();
    });

    resetBtn.addEventListener('click', () => {
      this.resetDeckLearning(deck);
    });
  }

  startDeckLearning(deck) {
    this.deckLearningState = {
      deck: deck,
      currentIndex: 0,
      totalSlots: deck.rows * deck.columns,
      learnedHotkeys: []
    };

    // Update UI
    const startBtn = this.currentDialog.querySelector('#startDeckLearning');
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const progress = this.currentDialog.querySelector('#learningProgress');

    startBtn.style.display = 'none';
    skipBtn.style.display = 'inline-block';
    progress.style.display = 'block';

    this.advanceDeckLearning();
  }

  advanceDeckLearning() {
    if (!this.deckLearningState) return;

    const { deck, currentIndex, totalSlots } = this.deckLearningState;

    if (currentIndex >= totalSlots) {
      this.completeDeckLearning();
      return;
    }

    const row = Math.floor(currentIndex / deck.columns);
    const col = currentIndex % deck.columns;

    // Update UI
    this.updateDeckLearningProgress(row, col);

    // Highlight current slot
    this.highlightCurrentSlot(currentIndex);

    // Start learning for this position
    this.hotkeyManager.startLearningMode((trigger) => {
      this.onDeckPositionLearned(trigger, row, col);
    });
  }

  updateDeckLearningProgress(row, col) {
    const currentPosition = this.currentDialog.querySelector('#currentPosition');
    const progressText = this.currentDialog.querySelector('#progressText');
    const progressFill = this.currentDialog.querySelector('#progressFill');

    const { currentIndex, totalSlots } = this.deckLearningState;
    const percentage = (currentIndex / totalSlots) * 100;

    currentPosition.textContent = `Position ${row + 1}, ${col + 1}`;
    progressText.textContent = `${currentIndex} / ${totalSlots}`;
    progressFill.style.width = `${percentage}%`;
  }

  highlightCurrentSlot(index) {
    // Remove previous highlights
    const slots = this.currentDialog.querySelectorAll('.learning-slot');
    slots.forEach(slot => slot.classList.remove('current'));

    // Highlight current slot
    const currentSlot = this.currentDialog.querySelector(`[data-index="${index}"]`);
    if (currentSlot) {
      currentSlot.classList.add('current');
    }
  }

  onDeckPositionLearned(trigger, row, col) {
    const { deck } = this.deckLearningState;

    // Create hotkey for this position
    const hotkey = this.hotkeyManager.createHotkey({
      name: `${deck.name} ${row + 1},${col + 1}`,
      description: `Deck-Hotkey für Position ${row + 1}, ${col + 1}`,
      deckId: deck.id,
      position: { row, col }
    });

    // Add trigger
    this.hotkeyManager.addTriggerToHotkey(hotkey.id, trigger);

    // Update slot status
    const currentSlot = this.currentDialog.querySelector(`[data-index="${this.deckLearningState.currentIndex}"]`);
    if (currentSlot) {
      currentSlot.querySelector('.slot-status').textContent = '✅';
      currentSlot.classList.remove('current');
      currentSlot.classList.add('learned');
    }

    // Add to learned hotkeys
    this.deckLearningState.learnedHotkeys.push(hotkey);
    this.deckLearningState.currentIndex++;

    // Continue with next position
    setTimeout(() => {
      this.advanceDeckLearning();
    }, 500);
  }

  skipCurrentPosition() {
    if (!this.deckLearningState) return;

    this.hotkeyManager.stopLearningMode();

    // Update slot status
    const currentSlot = this.currentDialog.querySelector(`[data-index="${this.deckLearningState.currentIndex}"]`);
    if (currentSlot) {
      currentSlot.querySelector('.slot-status').textContent = '⏭️';
      currentSlot.classList.remove('current');
      currentSlot.classList.add('skipped');
    }

    this.deckLearningState.currentIndex++;
    this.advanceDeckLearning();
  }

  completeDeckLearning() {
    const { learnedHotkeys } = this.deckLearningState;

    // Update UI
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const startBtn = this.currentDialog.querySelector('#startDeckLearning');

    skipBtn.style.display = 'none';
    startBtn.textContent = '✅ Abgeschlossen';
    startBtn.style.display = 'inline-block';
    startBtn.disabled = true;

    this.deckLearningState = null;
    this.uiManager.showSuccessMessage(`Deck-Lernen abgeschlossen! ${learnedHotkeys.length} Hotkeys erstellt.`);
  }

  resetDeckLearning(deck) {
    if (this.deckLearningState) {
      this.hotkeyManager.stopLearningMode();
    }

    // Reset UI
    const slots = this.currentDialog.querySelector('.preview-grid');
    slots.innerHTML = this.renderDeckLearningPreview(deck);

    const startBtn = this.currentDialog.querySelector('#startDeckLearning');
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const progress = this.currentDialog.querySelector('#learningProgress');

    startBtn.style.display = 'inline-block';
    startBtn.textContent = '🎓 Lernen starten';
    startBtn.disabled = false;
    skipBtn.style.display = 'none';
    progress.style.display = 'none';

    this.deckLearningState = null;
  }

  // ===== UTILITY METHODS =====

  createDialog(id, title, content, buttons = {}) {
    // Remove existing dialog
    this.closeDialog();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hotkey-dialog';
    overlay.id = `dialog-${id}`;

    overlay.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="window.hotkeyDialogManager.closeDialog()">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${buttons.secondaryButton ? 
            `<button class="btn-secondary" id="secondaryBtn">${buttons.secondaryButton.text}</button>` : 
            ''
          }
          ${buttons.primaryButton ? 
            `<button class="btn-primary" id="primaryBtn">${buttons.primaryButton.text}</button>` : 
            ''
          }
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.currentDialog = overlay;

    // Setup button events
    if (buttons.primaryButton) {
      const primaryBtn = overlay.querySelector('#primaryBtn');
      primaryBtn?.addEventListener('click', buttons.primaryButton.action);
    }

    if (buttons.secondaryButton) {
      const secondaryBtn = overlay.querySelector('#secondaryBtn');
      secondaryBtn?.addEventListener('click', buttons.secondaryButton.action);
    }

    // Close on outside click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeDialog();
      }
    });

    // ESC key support
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return overlay;
  }

  closeDialog() {
    if (this.currentDialog) {
      this.currentDialog.remove();
      this.currentDialog = null;
    }

    // Stop any ongoing learning
    if (this.learningState) {
      this.hotkeyManager.stopLearningMode();
      this.learningState = null;
    }

    if (this.deckLearningState) {
      this.hotkeyManager.stopLearningMode();
      this.deckLearningState = null;
    }
  }
}

// Export for global access
console.log('HotkeyDialogManager: Dialog system loaded');
window.HotkeyDialogManager = HotkeyDialogManager;