// Modern Hotkey Dialog Manager - Fokus auf Deck-Learning und Essentials
class HotkeyDialogManager {
  constructor(hotkeyManager, hotkeyUIManager, uiManager) {
    this.hotkeyManager = hotkeyManager;
    this.hotkeyUIManager = hotkeyUIManager;
    this.uiManager = uiManager;
    this.currentDialog = null;
    this.deckLearningState = null;
    
    console.log('HotkeyDialogManager: Modern dialog system initialized');
  }

  // ===== DECK-SPEZIFISCHES MIDI-LEARNING (HAUPTFEATURE) =====

  showDeckLearningDialog(deck) {
    console.log('Starting deck learning for:', deck.name);
    
    const dialog = this.createDialog('deck-learning', `🎹 Deck lernen: ${deck.name}`, `
      <div class="deck-learning-content">
        <div class="deck-info">
          <h4>📋 Deck: ${deck.name}</h4>
          <p><strong>Layout:</strong> ${deck.rows} × ${deck.columns} = ${deck.rows * deck.columns} Plätze</p>
          ${deck.description ? `<p class="deck-description">${deck.description}</p>` : ''}
          ${deck.isSubDeck ? `<p class="subdeck-notice">⚠️ <strong>Unterdeck:</strong> MIDI-Zuordnungen werden vom Hauptdeck übernommen</p>` : ''}
        </div>

        <div class="learning-instructions">
          <h4>🎓 So funktioniert's:</h4>
          <ol>
            <li><strong>Klicke "Lernen starten"</strong> um das MIDI-Learning zu beginnen</li>
            <li><strong>Drücke nacheinander</strong> die Buttons/Regler auf deinem MIDI-Controller</li>
            <li><strong>Die Zuordnung gilt für alle Unterdecks</strong> - Position bleibt gleich, Aktionen können unterschiedlich sein</li>
            <li><strong>"Position überspringen"</strong> wenn du einen Platz frei lassen möchtest</li>
          </ol>
        </div>

        <div class="deck-preview-learning">
          <div class="learning-grid" style="grid-template-columns: repeat(${deck.columns}, 1fr);">
            ${this.renderDeckLearningGrid(deck)}
          </div>
        </div>

        <div class="learning-controls">
          <button type="button" class="btn-primary" id="startDeckLearning">🎓 Lernen starten</button>
          <button type="button" class="btn-secondary" id="skipPosition" style="display: none;">⏭️ Position überspringen</button>
          <button type="button" class="btn-danger" id="stopLearning" style="display: none;">⏹️ Lernen stoppen</button>
          <button type="button" class="btn-secondary" id="resetDeckLearning">🔄 Zurücksetzen</button>
        </div>

        <div class="learning-progress" id="learningProgress" style="display: none;">
          <div class="progress-info">
            <span id="currentPosition">Position 1,1</span>
            <span id="progressText">0 / ${deck.rows * deck.columns}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
          </div>
        </div>

        <div class="learning-status" id="learningStatus" style="display: none;">
          <div class="status-content">
            <div class="learning-animation">🎹</div>
            <h4>Warte auf MIDI-Input...</h4>
            <p class="learning-instruction">Drücke einen Button oder bewege einen Regler auf deinem MIDI-Controller</p>
            <div class="position-indicator" id="positionIndicator">Position 1,1</div>
          </div>
        </div>
      </div>
    `, {
      secondaryButton: { text: 'Schließen', action: () => this.closeDialog() }
    });

    this.setupDeckLearningEvents(deck);
  }

  renderDeckLearningGrid(deck) {
    const totalSlots = deck.rows * deck.columns;
    let html = '';

    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / deck.columns);
      const col = i % deck.columns;
      
      // Check if there's already a hotkey at this position
      const existingHotkey = this.hotkeyManager.getHotkeysByDeck(deck.id)
        .find(h => h.position && h.position.row === row && h.position.col === col);
      
      const statusClass = existingHotkey ? 'learned' : 'empty';
      const statusIcon = existingHotkey ? '✅' : '⏳';
      
      html += `
        <div class="learning-slot ${statusClass}" data-position="${row},${col}" data-index="${i}">
          <span class="slot-position">${row + 1},${col + 1}</span>
          <div class="slot-status">${statusIcon}</div>
          ${existingHotkey ? `<div class="slot-trigger">${this.getHotkeyTriggerText(existingHotkey)}</div>` : ''}
        </div>
      `;
    }

    return html;
  }

  getHotkeyTriggerText(hotkey) {
    if (hotkey.triggers.length === 0) return 'Kein Trigger';
    const trigger = hotkey.triggers[0];
    if (trigger.type === 'midi') {
      return trigger.data.description || 'MIDI';
    }
    return trigger.data.description || trigger.type;
  }

  setupDeckLearningEvents(deck) {
    const startBtn = this.currentDialog.querySelector('#startDeckLearning');
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const stopBtn = this.currentDialog.querySelector('#stopLearning');
    const resetBtn = this.currentDialog.querySelector('#resetDeckLearning');

    startBtn.addEventListener('click', () => this.startDeckLearning(deck));
    skipBtn.addEventListener('click', () => this.skipCurrentPosition());
    stopBtn.addEventListener('click', () => this.stopDeckLearning());
    resetBtn.addEventListener('click', () => this.resetDeckLearning(deck));
  }

  startDeckLearning(deck) {
    if (deck.isSubDeck) {
      this.uiManager.showErrorMessage('Unterdeck-Learning nicht möglich', 'MIDI-Zuordnungen können nur für Hauptdecks gelernt werden. Das Unterdeck übernimmt automatisch die Zuordnungen des Hauptdecks.');
      return;
    }

    console.log('Starting deck learning for:', deck.name);

    // Find first empty position
    const totalSlots = deck.rows * deck.columns;
    let startIndex = 0;
    
    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / deck.columns);
      const col = i % deck.columns;
      const existingHotkey = this.hotkeyManager.getHotkeysByDeck(deck.id)
        .find(h => h.position && h.position.row === row && h.position.col === col);
      
      if (!existingHotkey) {
        startIndex = i;
        break;
      }
    }

    this.deckLearningState = {
      deck: deck,
      currentIndex: startIndex,
      totalSlots: totalSlots,
      learnedCount: 0
    };

    // Update UI
    const startBtn = this.currentDialog.querySelector('#startDeckLearning');
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const stopBtn = this.currentDialog.querySelector('#stopLearning');
    const progress = this.currentDialog.querySelector('#learningProgress');
    const status = this.currentDialog.querySelector('#learningStatus');

    startBtn.style.display = 'none';
    skipBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
    progress.style.display = 'block';
    status.style.display = 'block';

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

    console.log(`Learning position ${row + 1},${col + 1} (index: ${currentIndex})`);

    // Update UI
    this.updateDeckLearningProgress(row, col);
    this.highlightCurrentSlot(currentIndex);

    // Start MIDI learning for this position
    this.hotkeyManager.startLearningMode((trigger) => {
      this.onDeckPositionLearned(trigger, row, col);
    });
  }

  updateDeckLearningProgress(row, col) {
    const currentPosition = this.currentDialog.querySelector('#currentPosition');
    const positionIndicator = this.currentDialog.querySelector('#positionIndicator');
    const progressText = this.currentDialog.querySelector('#progressText');
    const progressFill = this.currentDialog.querySelector('#progressFill');

    const { currentIndex, totalSlots, learnedCount } = this.deckLearningState;
    const percentage = (learnedCount / totalSlots) * 100;

    if (currentPosition) currentPosition.textContent = `Position ${row + 1}, ${col + 1}`;
    if (positionIndicator) positionIndicator.textContent = `Position ${row + 1}, ${col + 1}`;
    if (progressText) progressText.textContent = `${learnedCount} / ${totalSlots}`;
    if (progressFill) progressFill.style.width = `${percentage}%`;
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
    if (!this.deckLearningState) return;

    const { deck } = this.deckLearningState;

    console.log(`MIDI learned for position ${row + 1},${col + 1}:`, trigger);

    // Create position-based hotkey without actions
    const hotkey = this.hotkeyManager.createHotkey({
      name: `${deck.name} ${row + 1},${col + 1}`,
      description: `Position ${row + 1},${col + 1} in ${deck.name}`,
      deckId: deck.id,
      position: { row, col }
    });

    // Add MIDI trigger
    this.hotkeyManager.addTriggerToHotkey(hotkey.id, trigger);

    // Update slot status
    const currentSlot = this.currentDialog.querySelector(`[data-index="${this.deckLearningState.currentIndex}"]`);
    if (currentSlot) {
      currentSlot.querySelector('.slot-status').textContent = '✅';
      currentSlot.classList.remove('current', 'empty');
      currentSlot.classList.add('learned');
      
      // Add trigger info
      const triggerDiv = document.createElement('div');
      triggerDiv.className = 'slot-trigger';
      triggerDiv.textContent = trigger.data.description;
      currentSlot.appendChild(triggerDiv);
    }

    this.deckLearningState.learnedCount++;
    
    // Find next empty position
    this.findNextEmptyPosition();

    // Continue with next position
    setTimeout(() => {
      this.advanceDeckLearning();
    }, 500);
  }

  findNextEmptyPosition() {
    const { deck, currentIndex, totalSlots } = this.deckLearningState;
    
    for (let i = currentIndex + 1; i < totalSlots; i++) {
      const row = Math.floor(i / deck.columns);
      const col = i % deck.columns;
      const existingHotkey = this.hotkeyManager.getHotkeysByDeck(deck.id)
        .find(h => h.position && h.position.row === row && h.position.col === col);
      
      if (!existingHotkey) {
        this.deckLearningState.currentIndex = i;
        return;
      }
    }
    
    // No more empty positions
    this.deckLearningState.currentIndex = totalSlots;
  }

  skipCurrentPosition() {
    if (!this.deckLearningState) return;

    console.log('Skipping position:', this.deckLearningState.currentIndex);

    this.hotkeyManager.stopLearningMode();

    // Update slot status
    const currentSlot = this.currentDialog.querySelector(`[data-index="${this.deckLearningState.currentIndex}"]`);
    if (currentSlot) {
      currentSlot.querySelector('.slot-status').textContent = '⏭️';
      currentSlot.classList.remove('current');
      currentSlot.classList.add('skipped');
    }

    this.findNextEmptyPosition();
    this.advanceDeckLearning();
  }

  stopDeckLearning() {
    console.log('Stopping deck learning');
    
    this.hotkeyManager.stopLearningMode();

    if (this.deckLearningState) {
      const { learnedCount } = this.deckLearningState;
      this.uiManager.showSuccessMessage(`Deck-Learning gestoppt. ${learnedCount} Positionen gelernt.`);
    }

    this.resetLearningUI();
    this.deckLearningState = null;
  }

  completeDeckLearning() {
    const { learnedCount, totalSlots } = this.deckLearningState;

    console.log(`Deck learning completed: ${learnedCount}/${totalSlots} positions learned`);

    this.resetLearningUI();
    this.deckLearningState = null;
    
    this.uiManager.showSuccessMessage(`🎉 Deck-Learning abgeschlossen! ${learnedCount} von ${totalSlots} Positionen gelernt.`);
  }

  resetLearningUI() {
    const startBtn = this.currentDialog.querySelector('#startDeckLearning');
    const skipBtn = this.currentDialog.querySelector('#skipPosition');
    const stopBtn = this.currentDialog.querySelector('#stopLearning');
    const progress = this.currentDialog.querySelector('#learningProgress');
    const status = this.currentDialog.querySelector('#learningStatus');

    if (startBtn) {
      startBtn.style.display = 'inline-block';
      startBtn.textContent = '🎓 Lernen starten';
      startBtn.disabled = false;
    }
    if (skipBtn) skipBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (status) status.style.display = 'none';
  }

  resetDeckLearning(deck) {
    if (this.deckLearningState) {
      this.hotkeyManager.stopLearningMode();
    }

    if (confirm(`Alle MIDI-Zuordnungen für "${deck.name}" wirklich löschen?`)) {
      // Delete all deck hotkeys
      const deckHotkeys = this.hotkeyManager.getHotkeysByDeck(deck.id);
      deckHotkeys.forEach(hotkey => {
        this.hotkeyManager.deleteHotkey(hotkey.id);
      });

      // Reset UI
      const grid = this.currentDialog.querySelector('.learning-grid');
      if (grid) {
        grid.innerHTML = this.renderDeckLearningGrid(deck);
      }

      this.resetLearningUI();
      this.deckLearningState = null;
      
      this.uiManager.showSuccessMessage(`Deck "${deck.name}" zurückgesetzt`);
    }
  }

  // ===== DECK CREATION/EDITING =====

  showCreateDeckDialog() {
    const dialog = this.createDialog('create-deck', '🎛️ Deck erstellen', `
      <form class="deck-form" id="deckForm">
        <div class="form-section">
          <h4>📋 Grundinformationen</h4>
          <div class="form-group">
            <label for="deckName">Name:</label>
            <input type="text" id="deckName" name="name" placeholder="Mein Deck" required>
          </div>
          <div class="form-group">
            <label for="deckDescription">Beschreibung:</label>
            <textarea id="deckDescription" name="description" placeholder="Optionale Beschreibung" rows="2"></textarea>
          </div>
        </div>

        <div class="form-section">
          <h4>📐 Layout</h4>
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
          <div class="deck-preview" id="deckPreview"></div>
        </div>

        <div class="form-section">
          <h4>🏗️ Deck-Typ</h4>
          <div class="form-group">
            <label for="deckParent">Übergeordnetes Deck:</label>
            <select id="deckParent" name="parentDeckId">
              <option value="">🎛️ Haupt-Deck (MIDI-lernfähig)</option>
              ${this.hotkeyManager.getMainDecks().map(deck => 
                `<option value="${deck.id}">📁 ${deck.name} (Unter-Deck)</option>`
              ).join('')}
            </select>
            <small class="help-text">Hauptdecks können MIDI lernen, Unterdecks übernehmen die MIDI-Zuordnungen</small>
          </div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Erstellen', action: () => this.handleCreateDeck() },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupDeckPreview();
  }

  showDeckEditDialog(deck) {
    const dialog = this.createDialog('edit-deck', `✏️ Deck bearbeiten: ${deck.name}`, `
      <form class="deck-form" id="editDeckForm">
        <div class="form-section">
          <h4>📋 Grundinformationen</h4>
          <div class="form-group">
            <label for="editDeckName">Name:</label>
            <input type="text" id="editDeckName" name="name" value="${deck.name}" required>
          </div>
          <div class="form-group">
            <label for="editDeckDescription">Beschreibung:</label>
            <textarea id="editDeckDescription" name="description" rows="2">${deck.description || ''}</textarea>
          </div>
        </div>

        <div class="form-section">
          <h4>📐 Layout</h4>
          ${deck.isSubDeck ? 
            `<p class="warning-text">⚠️ Größe wird automatisch vom Hauptdeck übernommen</p>` :
            `<div class="form-row">
              <div class="form-group">
                <label for="editDeckRows">Reihen:</label>
                <input type="number" id="editDeckRows" name="rows" min="1" max="8" value="${deck.rows}" required>
              </div>
              <div class="form-group">
                <label for="editDeckColumns">Spalten:</label>
                <input type="number" id="editDeckColumns" name="columns" min="1" max="8" value="${deck.columns}" required>
              </div>
            </div>`
          }
          <div class="deck-preview" id="editDeckPreview"></div>
        </div>

        <div class="form-section">
          <h4>📊 Statistiken</h4>
          <div class="deck-stats">
            <div class="stat-item">
              <span class="stat-number">${this.hotkeyManager.getHotkeysByDeck(deck.id).length}</span>
              <span class="stat-label">Hotkeys</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${deck.isSubDeck ? 0 : this.hotkeyManager.getSubDecks(deck.id).length}</span>
              <span class="stat-label">Unterdecks</span>
            </div>
          </div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Speichern', action: () => this.handleEditDeck(deck.id) },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupEditDeckPreview(deck);
  }

  setupDeckPreview() {
    const rowsInput = this.currentDialog.querySelector('#deckRows');
    const columnsInput = this.currentDialog.querySelector('#deckColumns');
    const preview = this.currentDialog.querySelector('#deckPreview');

    const updatePreview = () => {
      const rows = parseInt(rowsInput.value) || 4;
      const columns = parseInt(columnsInput.value) || 4;
      this.renderDeckPreview(preview, rows, columns);
    };

    rowsInput.addEventListener('input', updatePreview);
    columnsInput.addEventListener('input', updatePreview);
    updatePreview();
  }

  setupEditDeckPreview(deck) {
    const preview = this.currentDialog.querySelector('#editDeckPreview');
    
    if (deck.isSubDeck) {
      this.renderDeckPreview(preview, deck.rows, deck.columns);
    } else {
      const rowsInput = this.currentDialog.querySelector('#editDeckRows');
      const columnsInput = this.currentDialog.querySelector('#editDeckColumns');

      const updatePreview = () => {
        const rows = parseInt(rowsInput.value) || deck.rows;
        const columns = parseInt(columnsInput.value) || deck.columns;
        this.renderDeckPreview(preview, rows, columns);
      };

      rowsInput.addEventListener('input', updatePreview);
      columnsInput.addEventListener('input', updatePreview);
      updatePreview();
    }
  }

  renderDeckPreview(preview, rows, columns) {
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

  handleEditDeck(deckId) {
    const form = this.currentDialog.querySelector('#editDeckForm');
    const formData = new FormData(form);

    const deckData = {
      name: formData.get('name'),
      description: formData.get('description')
    };

    // Only update size for main decks
    const deck = this.hotkeyManager.getDeckById(deckId);
    if (deck && !deck.isSubDeck) {
      deckData.rows = parseInt(formData.get('rows'));
      deckData.columns = parseInt(formData.get('columns'));
    }

    this.hotkeyManager.updateDeck(deckId, deckData);
    
    this.closeDialog();
    this.uiManager.showSuccessMessage('Deck aktualisiert!');
  }

  // ===== HOTKEY EDIT DIALOG (COMPLETE) =====

  showHotkeyEditDialog(hotkey) {
    const dialog = this.createDialog('edit-hotkey', `✏️ Hotkey bearbeiten: ${hotkey.name}`, `
      <form class="hotkey-form" id="editHotkeyForm">
        <div class="form-section">
          <h4>📋 Grundinformationen</h4>
          <div class="form-group">
            <label for="editHotkeyName">Name:</label>
            <input type="text" id="editHotkeyName" name="name" value="${hotkey.name}" required>
          </div>
          <div class="form-group">
            <label for="editHotkeyDescription">Beschreibung:</label>
            <textarea id="editHotkeyDescription" name="description" rows="2">${hotkey.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="editHotkeyEnabled" name="enabled" ${hotkey.enabled ? 'checked' : ''}>
              Hotkey aktiviert
            </label>
          </div>
          ${hotkey.deckId ? `
            <div class="form-group">
              <label>Deck:</label>
              <span class="deck-info">${this.hotkeyManager.getDeckById(hotkey.deckId)?.name || 'Unbekannt'}</span>
              ${hotkey.position ? `<span class="position-info">Position: ${hotkey.position.row + 1}, ${hotkey.position.col + 1}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="form-section">
          <h4>🎹 Trigger</h4>
          <div class="existing-triggers" id="existingTriggers">
            ${hotkey.triggers.map((trigger, index) => `
              <div class="learned-trigger" data-trigger-index="${index}">
                <span class="trigger-icon">${trigger.type === 'midi' ? '🎹' : trigger.type === 'keyboard' ? '⌨️' : '🖱️'}</span>
                <span class="trigger-description">${trigger.data.description}</span>
                <button type="button" class="remove-trigger-btn" onclick="this.parentElement.remove()">×</button>
              </div>
            `).join('')}
          </div>
          <div class="trigger-controls">
            <button type="button" class="btn-secondary" id="editLearnMidiBtn">🎹 MIDI lernen</button>
            <button type="button" class="btn-secondary" id="editLearnKeyboardBtn">⌨️ Tastatur lernen</button>
          </div>
          <div id="editLearnedTrigger" style="display: none;">
            <div class="learned-trigger">
              <span id="editTriggerDescription"></span>
              <button type="button" class="remove-trigger-btn" onclick="document.getElementById('editLearnedTrigger').style.display='none'">×</button>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>⚡ Aktionen (${hotkey.actions.length})</h4>
          <div class="existing-actions" id="existingActions">
            ${hotkey.actions.map((action, index) => `
              <div class="action-item" data-action-id="${action.id}">
                <span class="action-order">${index + 1}.</span>
                <span class="action-description">${this.getActionDisplayText(action)}</span>
                <div class="action-controls">
                  <button type="button" class="btn-small" onclick="window.hotkeyDialogManager.editAction('${action.id}', '${hotkey.id}')">✏️</button>
                  <button type="button" class="remove-action-btn" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="add-action-section">
            <select id="editActionType">
              <option value="">Aktion hinzufügen...</option>
              <optgroup label="🎬 OBS Studio">
                <option value="obs_scene_switch">Szene wechseln</option>
                <option value="obs_source_visibility">Source Ein-/Ausblenden</option>
                <option value="obs_filter_toggle">Filter umschalten</option>
                <option value="obs_recording_toggle">Aufnahme umschalten</option>
                <option value="obs_streaming_toggle">Stream umschalten</option>
                <option value="obs_raw_request">Raw OBS Request</option>
              </optgroup>
              <optgroup label="🔊 Audio">
                <option value="audio_volume">Lautstärke setzen</option>
                <option value="audio_mute">Stumm schalten</option>
              </optgroup>
              <optgroup label="🎛️ Deck-Steuerung">
                <option value="deck_switch">Deck wechseln</option>
                <option value="sub_deck_switch">Unter-Deck wechseln</option>
              </optgroup>
              <optgroup label="⏱️ Hilfsmittel">
                <option value="delay">Verzögerung</option>
              </optgroup>
            </select>
            <button type="button" id="editAddActionBtn" class="btn-secondary">+ Hinzufügen</button>
          </div>
          <div id="editActionConfig" style="display: none;"></div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Speichern', action: () => this.handleEditHotkey(hotkey.id) },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupEditHotkeyEvents(hotkey);
  }

  setupEditHotkeyEvents(hotkey) {
    const editLearnMidiBtn = this.currentDialog.querySelector('#editLearnMidiBtn');
    const editLearnKeyboardBtn = this.currentDialog.querySelector('#editLearnKeyboardBtn');
    const editAddActionBtn = this.currentDialog.querySelector('#editAddActionBtn');
    const editActionType = this.currentDialog.querySelector('#editActionType');

    editLearnMidiBtn.addEventListener('click', () => this.startEditLearning('midi'));
    editLearnKeyboardBtn.addEventListener('click', () => this.startEditLearning('keyboard'));
    editAddActionBtn.addEventListener('click', () => {
      const actionType = editActionType.value;
      if (actionType) {
        this.addActionToEditForm(actionType, hotkey.id);
        editActionType.value = '';
      }
    });
    editActionType.addEventListener('change', () => this.updateEditActionConfig(editActionType.value));
  }

  startEditLearning(type) {
    const editLearnedTrigger = this.currentDialog.querySelector('#editLearnedTrigger');
    const editTriggerDescription = this.currentDialog.querySelector('#editTriggerDescription');
    
    // Show learning state
    const buttons = this.currentDialog.querySelectorAll('#editLearnMidiBtn, #editLearnKeyboardBtn');
    buttons.forEach(btn => {
      btn.textContent = '⏳ Lernen...';
      btn.disabled = true;
    });

    this.hotkeyManager.startLearningMode((trigger) => {
      // Show learned trigger
      editTriggerDescription.textContent = trigger.data.description;
      editLearnedTrigger.style.display = 'block';
      editLearnedTrigger.dataset.trigger = JSON.stringify(trigger);
      
      // Reset buttons
      buttons.forEach(btn => btn.disabled = false);
      this.currentDialog.querySelector('#editLearnMidiBtn').textContent = '🎹 MIDI lernen';
      this.currentDialog.querySelector('#editLearnKeyboardBtn').textContent = '⌨️ Tastatur lernen';
    });
  }

  updateEditActionConfig(actionType) {
    const editActionConfig = this.currentDialog.querySelector('#editActionConfig');
    
    if (!actionType) {
      editActionConfig.style.display = 'none';
      return;
    }

    editActionConfig.style.display = 'block';
    editActionConfig.innerHTML = this.getActionConfigHTML(actionType);
  }

  addActionToEditForm(actionType, hotkeyId) {
    const config = this.getActionConfigFromForm();
    if (!config && this.requiresConfig(actionType)) {
      this.uiManager.showErrorMessage('Konfiguration erforderlich', 'Bitte konfiguriere die Aktion bevor du sie hinzufügst.');
      return;
    }

    // Add action to hotkey
    const success = this.hotkeyManager.addActionToHotkey(hotkeyId, {
      type: actionType,
      data: config || {}
    });

    if (success) {
      // Refresh the edit dialog
      const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
      this.closeDialog();
      this.showHotkeyEditDialog(hotkey);
    }
  }

  handleEditHotkey(hotkeyId) {
    const form = this.currentDialog.querySelector('#editHotkeyForm');
    const formData = new FormData(form);

    // Update basic properties
    const updates = {
      name: formData.get('name'),
      description: formData.get('description'),
      enabled: formData.get('enabled') === 'on'
    };

    this.hotkeyManager.updateHotkey(hotkeyId, updates);

    // Handle new trigger if learned
    const editLearnedTrigger = this.currentDialog.querySelector('#editLearnedTrigger');
    if (editLearnedTrigger.style.display !== 'none' && editLearnedTrigger.dataset.trigger) {
      const trigger = JSON.parse(editLearnedTrigger.dataset.trigger);
      this.hotkeyManager.addTriggerToHotkey(hotkeyId, trigger);
    }

    // Remove deleted triggers
    const hotkey = this.hotkeyManager.getHotkeyById(hotkeyId);
    const remainingTriggers = this.currentDialog.querySelectorAll('.existing-triggers .learned-trigger');
    
    if (remainingTriggers.length < hotkey.triggers.length) {
      // Some triggers were removed, rebuild trigger list
      const newTriggers = [];
      remainingTriggers.forEach(triggerEl => {
        const index = parseInt(triggerEl.dataset.triggerIndex);
        if (index < hotkey.triggers.length) {
          newTriggers.push(hotkey.triggers[index]);
        }
      });
      
      // Update hotkey with remaining triggers
      this.hotkeyManager.updateHotkey(hotkeyId, { triggers: newTriggers });
    }

    this.closeDialog();
    this.uiManager.showSuccessMessage('Hotkey aktualisiert!');
  }

  getActionDisplayText(action) {
    switch (action.type) {
      case 'obs_scene_switch':
        return `Szene wechseln: ${action.data.sceneName}`;
      case 'obs_source_visibility':
        const visibilityText = action.data.visible === 'toggle' ? 'umschalten' : 
                               action.data.visible ? 'einblenden' : 'ausblenden';
        return `Source ${visibilityText}: ${action.data.sourceName}`;
      case 'obs_filter_toggle':
        return `Filter ${action.data.enabled ? 'aktivieren' : 'deaktivieren'}: ${action.data.filterName} (${action.data.sourceName})`;
      case 'obs_raw_request':
        return `OBS Request: ${action.data.requestType}`;
      case 'deck_switch':
        const deck = this.hotkeyManager.getDeckById(action.data.deckId);
        return `Deck wechseln: ${deck?.name || 'Unbekannt'}`;
      case 'sub_deck_switch':
        if (action.data.subDeckId) {
          const subDeck = this.hotkeyManager.getDeckById(action.data.subDeckId);
          const mainDeck = this.hotkeyManager.getDeckById(action.data.mainDeckId);
          return `Zu Unter-Deck: ${subDeck?.name || 'Unbekannt'} (${mainDeck?.name || 'Unbekannt'})`;
        } else {
          const mainDeck = this.hotkeyManager.getDeckById(action.data.mainDeckId);
          return `Zurück zu Haupt-Deck: ${mainDeck?.name || 'Unbekannt'}`;
        }
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

  showCreateHotkeyDialog(options = {}) {
    const dialog = this.createDialog('create-hotkey', '🎹 Hotkey erstellen', `
      <form class="hotkey-form" id="hotkeyForm">
        <div class="form-section">
          <h4>📋 Grundinformationen</h4>
          <div class="form-group">
            <label for="hotkeyName">Name:</label>
            <input type="text" id="hotkeyName" name="name" placeholder="Mein Hotkey" required>
          </div>
          <div class="form-group">
            <label for="hotkeyDescription">Beschreibung:</label>
            <textarea id="hotkeyDescription" name="description" placeholder="Optionale Beschreibung" rows="2"></textarea>
          </div>
          ${options.deckId ? `
            <div class="form-group">
              <label>Deck:</label>
              <span class="deck-info">${this.hotkeyManager.getDeckById(options.deckId)?.name || 'Unbekannt'}</span>
              ${options.position ? `<span class="position-info">Position: ${options.position.row + 1}, ${options.position.col + 1}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="form-section">
          <h4>🎹 Trigger (optional)</h4>
          <p class="help-text">Lasse leer um nur per Klick auszuführen</p>
          <div class="trigger-section">
            <button type="button" class="btn-secondary" id="learnMidiBtn">🎹 MIDI lernen</button>
            <button type="button" class="btn-secondary" id="learnKeyboardBtn">⌨️ Tastatur lernen</button>
            <div id="learnedTrigger" style="display: none;">
              <div class="learned-trigger">
                <span id="triggerDescription"></span>
                <button type="button" class="remove-trigger-btn" onclick="document.getElementById('learnedTrigger').style.display='none'">×</button>
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>⚡ Aktion</h4>
          <div class="action-selection">
            <select id="actionType" name="actionType">
              <option value="">Keine Aktion (nur als Platzhalter)</option>
              <optgroup label="🎬 OBS Studio">
                <option value="obs_scene_switch">Szene wechseln</option>
                <option value="obs_source_visibility">Source Ein-/Ausblenden</option>
                <option value="obs_filter_toggle">Filter umschalten</option>
                <option value="obs_recording_toggle">Aufnahme umschalten</option>
                <option value="obs_streaming_toggle">Stream umschalten</option>
                <option value="obs_raw_request">Raw OBS Request</option>
              </optgroup>
              <optgroup label="🔊 Audio">
                <option value="audio_volume">Lautstärke setzen</option>
                <option value="audio_mute">Stumm schalten</option>
              </optgroup>
              <optgroup label="🎛️ Deck-Steuerung">
                <option value="deck_switch">Deck wechseln</option>
                <option value="sub_deck_switch">Unter-Deck wechseln</option>
              </optgroup>
              <optgroup label="⏱️ Hilfsmittel">
                <option value="delay">Verzögerung</option>
              </optgroup>
            </select>
          </div>
          <div id="actionConfig" style="display: none;"></div>
        </div>
      </form>
    `, {
      primaryButton: { text: 'Erstellen', action: () => this.handleCreateHotkey(options) },
      secondaryButton: { text: 'Abbrechen', action: () => this.closeDialog() }
    });

    this.setupSimpleHotkeyEvents();
  }

  setupSimpleHotkeyEvents() {
    const learnMidiBtn = this.currentDialog.querySelector('#learnMidiBtn');
    const learnKeyboardBtn = this.currentDialog.querySelector('#learnKeyboardBtn');
    const actionType = this.currentDialog.querySelector('#actionType');

    learnMidiBtn.addEventListener('click', () => this.startSimpleLearning('midi'));
    learnKeyboardBtn.addEventListener('click', () => this.startSimpleLearning('keyboard'));
    actionType.addEventListener('change', () => this.updateActionConfig(actionType.value));
  }

  startSimpleLearning(type) {
    const learnedTrigger = this.currentDialog.querySelector('#learnedTrigger');
    const triggerDescription = this.currentDialog.querySelector('#triggerDescription');
    
    // Show learning state
    const buttons = this.currentDialog.querySelectorAll('#learnMidiBtn, #learnKeyboardBtn');
    buttons.forEach(btn => {
      btn.textContent = '⏳ Lernen...';
      btn.disabled = true;
    });

    this.hotkeyManager.startLearningMode((trigger) => {
      // Show learned trigger
      triggerDescription.textContent = trigger.data.description;
      learnedTrigger.style.display = 'block';
      learnedTrigger.dataset.trigger = JSON.stringify(trigger);
      
      // Reset buttons
      buttons.forEach(btn => {
        btn.disabled = false;
      });
      this.currentDialog.querySelector('#learnMidiBtn').textContent = '🎹 MIDI lernen';
      this.currentDialog.querySelector('#learnKeyboardBtn').textContent = '⌨️ Tastatur lernen';
    });
  }

  updateActionConfig(actionType) {
    const actionConfig = this.currentDialog.querySelector('#actionConfig');
    
    if (!actionType) {
      actionConfig.style.display = 'none';
      return;
    }

    actionConfig.style.display = 'block';
    
    switch (actionType) {
      case 'obs_scene_switch':
        actionConfig.innerHTML = `
          <div class="form-group">
            <label for="sceneName">Szene:</label>
            <input type="text" id="sceneName" name="sceneName" placeholder="Szene eingeben" required>
          </div>
        `;
        break;
      case 'deck_switch':
        const decks = this.hotkeyManager.getAllDecks();
        actionConfig.innerHTML = `
          <div class="form-group">
            <label for="deckId">Ziel-Deck:</label>
            <select id="deckId" name="deckId" required>
              <option value="">Deck auswählen...</option>
              ${decks.map(deck => `<option value="${deck.id}">${deck.name}</option>`).join('')}
            </select>
          </div>
        `;
        break;
      default:
        actionConfig.innerHTML = '<p>Keine weitere Konfiguration erforderlich</p>';
    }
  }

  handleCreateHotkey(options = {}) {
    const form = this.currentDialog.querySelector('#hotkeyForm');
    const formData = new FormData(form);

    // Create hotkey
    const hotkey = this.hotkeyManager.createHotkey({
      name: formData.get('name'),
      description: formData.get('description'),
      deckId: options.deckId || null,
      position: options.position || null
    });

    // Add trigger if learned
    const learnedTrigger = this.currentDialog.querySelector('#learnedTrigger');
    if (learnedTrigger.style.display !== 'none' && learnedTrigger.dataset.trigger) {
      const trigger = JSON.parse(learnedTrigger.dataset.trigger);
      this.hotkeyManager.addTriggerToHotkey(hotkey.id, trigger);
    }

    // Add action if configured
    const actionType = formData.get('actionType');
    if (actionType) {
      let actionData = {};
      
      switch (actionType) {
        case 'obs_scene_switch':
          actionData = { sceneName: formData.get('sceneName') };
          break;
        case 'deck_switch':
          actionData = { deckId: formData.get('deckId') };
          break;
      }

      if (Object.keys(actionData).length > 0) {
        this.hotkeyManager.addActionToHotkey(hotkey.id, {
          type: actionType,
          data: actionData
        });
      }
    }

    this.closeDialog();
    this.uiManager.showSuccessMessage(`Hotkey "${hotkey.name}" erstellt!`);
  }

  // ===== QUICK LEARNING =====

  startQuickLearning() {
    this.uiManager.showInfoMessage('Quick Learning', 'Verwende "Deck Hotkeys lernen" für eine vollständige Deck-Konfiguration oder erstelle einzelne Hotkeys über das ➕ Menü.');
  }

  // ===== IMPORT/EXPORT (SIMPLIFIED) =====

  showImportExportDialog() {
    const stats = this.hotkeyManager.getStats();
    
    const dialog = this.createDialog('import-export', '💾 Import / Export', `
      <div class="import-export-content">
        <div class="current-config">
          <h4>📊 Aktuelle Konfiguration:</h4>
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
          <h4>📤 Export:</h4>
          <p>Exportiere deine aktuelle Hotkey-Konfiguration</p>
          <button type="button" class="btn-primary" id="exportBtn">📤 Konfiguration exportieren</button>
        </div>

        <div class="import-section">
          <h4>📥 Import:</h4>
          <p>Importiere eine zuvor exportierte Konfiguration</p>
          <p class="warning-text">⚠️ Ersetzt die aktuelle Konfiguration!</p>
          <input type="file" id="importFile" accept=".json" style="display: none;">
          <button type="button" class="btn-secondary" id="importBtn">📥 Datei auswählen</button>
          <span id="fileName" class="file-name"></span>
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

    exportBtn.addEventListener('click', () => this.exportConfiguration());
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => this.importConfiguration(e.target.files[0]));
  }

  exportConfiguration() {
    const config = this.hotkeyManager.exportConfiguration();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `obs-midi-mixer-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.uiManager.showSuccessMessage('Konfiguration exportiert!');
  }

  async importConfiguration(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (confirm('Aktuelle Konfiguration ersetzen? Alle bestehenden Hotkeys und Decks gehen verloren.')) {
        this.hotkeyManager.importConfiguration(config);
        this.closeDialog();
        this.uiManager.showSuccessMessage('Konfiguration importiert!');
      }
    } catch (error) {
      console.error('Import error:', error);
      this.uiManager.showErrorMessage('Import-Fehler', 'Die Datei konnte nicht gelesen werden.');
    }
  }

  // ===== DIALOG UTILITIES =====

  createDialog(id, title, content, buttons = {}) {
    this.closeDialog();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hotkey-dialog';
    overlay.id = `dialog-${id}`;

    overlay.innerHTML = `
      <div class="modal-content">
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
      if (e.target === overlay) this.closeDialog();
    });

    return overlay;
  }

  closeDialog() {
    if (this.currentDialog) {
      this.currentDialog.remove();
      this.currentDialog = null;
    }

    // Stop any ongoing learning
    if (this.deckLearningState) {
      this.hotkeyManager.stopLearningMode();
      this.deckLearningState = null;
    }
  }
}

// Export for global access
console.log('HotkeyDialogManager: Modern dialog system loaded - focus on deck learning');
window.HotkeyDialogManager = HotkeyDialogManager;