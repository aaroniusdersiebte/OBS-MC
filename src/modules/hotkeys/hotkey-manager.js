// Enhanced Hotkey Manager - Erweiterte Hotkey-Funktionalität mit Decks und Multi-Aktionen
class HotkeyManager {
  constructor() {
    this.hotkeys = [];
    this.decks = [];
    this.currentDeck = null;
    this.actionHistory = [];
    this.isLearningMode = false;
    this.learningCallback = null;
    
    console.log('HotkeyManager: Initializing enhanced hotkey system...');
    
    this.initializeManager();
  }

  initializeManager() {
    // Load saved hotkeys and decks
    this.loadHotkeysFromStorage();
    this.loadDecksFromStorage();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('HotkeyManager: Enhanced system initialized with', this.hotkeys.length, 'hotkeys and', this.decks.length, 'decks');
  }

  // ===== HOTKEY MANAGEMENT =====

  createHotkey(options = {}) {
    const hotkey = {
      id: this.generateId(),
      name: options.name || `Hotkey ${this.hotkeys.length + 1}`,
      description: options.description || '',
      triggers: [], // Array of trigger objects { type, data }
      actions: [], // Array of action objects { type, data, delay }
      enabled: true,
      order: this.hotkeys.length,
      deckId: options.deckId || null,
      position: options.position || null, // For deck positioning
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0
    };

    this.hotkeys.push(hotkey);
    this.saveHotkeysToStorage();
    this.emit('hotkeyCreated', hotkey);

    console.log('HotkeyManager: Created hotkey:', hotkey.name);
    return hotkey;
  }

  updateHotkey(hotkeyId, updates) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey) return false;

    Object.assign(hotkey, updates);
    this.saveHotkeysToStorage();
    this.emit('hotkeyUpdated', hotkey);

    return true;
  }

  deleteHotkey(hotkeyId) {
    const index = this.hotkeys.findIndex(h => h.id === hotkeyId);
    if (index === -1) return false;

    const hotkey = this.hotkeys[index];
    this.hotkeys.splice(index, 1);
    this.saveHotkeysToStorage();
    this.emit('hotkeyDeleted', hotkey);

    return true;
  }

  getHotkeyById(hotkeyId) {
    return this.hotkeys.find(h => h.id === hotkeyId);
  }

  getAllHotkeys() {
    return [...this.hotkeys];
  }

  getHotkeysByDeck(deckId) {
    return this.hotkeys.filter(h => h.deckId === deckId);
  }

  getStandaloneHotkeys() {
    return this.hotkeys.filter(h => !h.deckId);
  }

  // ===== TRIGGER MANAGEMENT =====

  addTriggerToHotkey(hotkeyId, trigger) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey) return false;

    // Validate trigger
    if (!this.validateTrigger(trigger)) {
      console.error('HotkeyManager: Invalid trigger:', trigger);
      return false;
    }

    // Remove existing trigger of same type
    hotkey.triggers = hotkey.triggers.filter(t => t.type !== trigger.type);
    
    // Add new trigger
    hotkey.triggers.push(trigger);
    this.saveHotkeysToStorage();

    console.log('HotkeyManager: Added trigger to hotkey:', hotkey.name, trigger);
    return true;
  }

  removeTriggerFromHotkey(hotkeyId, triggerType) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey) return false;

    hotkey.triggers = hotkey.triggers.filter(t => t.type !== triggerType);
    this.saveHotkeysToStorage();

    return true;
  }

  validateTrigger(trigger) {
    const validTypes = ['midi', 'keyboard', 'click'];
    return validTypes.includes(trigger.type) && trigger.data;
  }

  // ===== ACTION MANAGEMENT =====

  addActionToHotkey(hotkeyId, action) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey) return false;

    // Validate action
    if (!this.validateAction(action)) {
      console.error('HotkeyManager: Invalid action:', action);
      return false;
    }

    action.id = this.generateId();
    action.order = hotkey.actions.length;
    action.delay = action.delay || 0;

    hotkey.actions.push(action);
    this.saveHotkeysToStorage();

    console.log('HotkeyManager: Added action to hotkey:', hotkey.name, action);
    return true;
  }

  removeActionFromHotkey(hotkeyId, actionId) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey) return false;

    hotkey.actions = hotkey.actions.filter(a => a.id !== actionId);
    this.saveHotkeysToStorage();

    return true;
  }

  reorderActions(hotkeyId, actionOrders) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey) return false;

    actionOrders.forEach((order, index) => {
      const action = hotkey.actions.find(a => a.id === order.id);
      if (action) {
        action.order = index;
      }
    });

    hotkey.actions.sort((a, b) => a.order - b.order);
    this.saveHotkeysToStorage();

    return true;
  }

  validateAction(action) {
    const validTypes = [
      'obs_scene_switch',
      'obs_source_visibility',
      'obs_raw_request',
      'obs_filter_toggle',
      'obs_recording_toggle',
      'obs_streaming_toggle',
      'deck_switch',
      'delay',
      'audio_volume',
      'audio_mute'
    ];
    return validTypes.includes(action.type) && action.data;
  }

  // ===== HOTKEY EXECUTION =====

  async executeHotkey(hotkeyId) {
    const hotkey = this.getHotkeyById(hotkeyId);
    if (!hotkey || !hotkey.enabled) return false;

    hotkey.lastTriggered = Date.now();
    hotkey.triggerCount++;

    console.log('HotkeyManager: Executing hotkey:', hotkey.name, 'with', hotkey.actions.length, 'actions');

    // Add haptic feedback
    this.triggerHapticFeedback();

    // Execute actions in sequence
    try {
      for (const action of hotkey.actions.sort((a, b) => a.order - b.order)) {
        if (action.delay > 0) {
          await this.delay(action.delay);
        }
        await this.executeAction(action);
      }

      this.actionHistory.push({
        hotkeyId: hotkeyId,
        timestamp: Date.now(),
        success: true
      });

      this.emit('hotkeyExecuted', { hotkey, success: true });
      return true;

    } catch (error) {
      console.error('HotkeyManager: Error executing hotkey:', error);
      this.actionHistory.push({
        hotkeyId: hotkeyId,
        timestamp: Date.now(),
        success: false,
        error: error.message
      });

      this.emit('hotkeyExecuted', { hotkey, success: false, error });
      return false;
    }
  }

  async executeAction(action) {
    console.log('HotkeyManager: Executing action:', action.type, action.data);

    switch (action.type) {
      case 'obs_scene_switch':
        return this.executeObsSceneSwitch(action.data);
      
      case 'obs_source_visibility':
        return this.executeObsSourceVisibility(action.data);
      
      case 'obs_raw_request':
        return this.executeObsRawRequest(action.data);
      
      case 'obs_filter_toggle':
        return this.executeObsFilterToggle(action.data);
      
      case 'obs_recording_toggle':
        return this.executeObsRecordingToggle();
      
      case 'obs_streaming_toggle':
        return this.executeObsStreamingToggle();
      
      case 'deck_switch':
        return this.executeDeckSwitch(action.data);
      
      case 'delay':
        return this.delay(action.data.duration);
      
      case 'audio_volume':
        return this.executeAudioVolume(action.data);
      
      case 'audio_mute':
        return this.executeAudioMute(action.data);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // ===== ACTION IMPLEMENTATIONS =====

  async executeObsSceneSwitch(data) {
    if (!window.obsManager || !window.obsManager.isConnected) {
      throw new Error('OBS not connected');
    }
    return window.obsManager.setCurrentProgramScene(data.sceneName);
  }

  async executeObsSourceVisibility(data) {
    if (!window.obsManager || !window.obsManager.isConnected) {
      throw new Error('OBS not connected');
    }
    
    // Handle toggle functionality
    if (data.visible === 'toggle') {
      try {
        // Get current visibility state
        const sceneItems = await window.obsManager.getSceneItems(data.sceneName);
        const sceneItem = sceneItems.find(item => 
          item.sourceName === data.sourceName || item.inputName === data.sourceName
        );
        
        if (!sceneItem) {
          throw new Error(`Source "${data.sourceName}" not found in scene "${data.sceneName}"`);
        }
        
        // Invert current state
        const newVisibility = !sceneItem.sceneItemEnabled;
        
        return window.obsManager.setSceneItemEnabled(
          data.sceneName,
          data.sourceName,
          newVisibility
        );
      } catch (error) {
        console.error('Error in toggle source visibility:', error);
        throw error;
      }
    }
    
    // Handle explicit true/false
    return window.obsManager.setSceneItemEnabled(
      data.sceneName,
      data.sourceName,
      data.visible
    );
  }

  async executeObsRawRequest(data) {
    if (!window.obsManager || !window.obsManager.isConnected) {
      throw new Error('OBS not connected');
    }
    return window.obsManager.call(data.requestType, data.requestData);
  }

  async executeObsFilterToggle(data) {
    if (!window.obsManager || !window.obsManager.isConnected) {
      throw new Error('OBS not connected');
    }
    return window.obsManager.setSourceFilterEnabled(
      data.sourceName,
      data.filterName,
      data.enabled
    );
  }

  async executeObsRecordingToggle() {
    if (!window.obsManager || !window.obsManager.isConnected) {
      throw new Error('OBS not connected');
    }
    const status = await window.obsManager.getRecordStatus();
    return status.outputActive ? 
      window.obsManager.stopRecord() : 
      window.obsManager.startRecord();
  }

  async executeObsStreamingToggle() {
    if (!window.obsManager || !window.obsManager.isConnected) {
      throw new Error('OBS not connected');
    }
    const status = await window.obsManager.getStreamStatus();
    return status.outputActive ? 
      window.obsManager.stopStream() : 
      window.obsManager.startStream();
  }

  async executeDeckSwitch(data) {
    return this.switchToDeck(data.deckId);
  }

  async executeAudioVolume(data) {
    if (!window.audioManager) {
      throw new Error('Audio manager not available');
    }
    return window.audioManager.setSourceVolume(data.sourceName, data.volume);
  }

  async executeAudioMute(data) {
    if (!window.audioManager) {
      throw new Error('Audio manager not available');
    }
    return window.audioManager.setSourceMute(data.sourceName, data.muted);
  }

  // ===== DECK MANAGEMENT =====

  createDeck(options = {}) {
    const deck = {
      id: this.generateId(),
      name: options.name || `Deck ${this.decks.length + 1}`,
      description: options.description || '',
      rows: options.rows || 4,
      columns: options.columns || 4,
      parentDeckId: options.parentDeckId || null,
      isSubDeck: !!options.parentDeckId,
      hotkeys: [], // Will be populated with positioned hotkeys
      enabled: true,
      createdAt: Date.now()
    };

    this.decks.push(deck);
    this.saveDecksToStorage();
    this.emit('deckCreated', deck);

    console.log('HotkeyManager: Created deck:', deck.name, `(${deck.rows}x${deck.columns})`);
    return deck;
  }

  updateDeck(deckId, updates) {
    const deck = this.getDeckById(deckId);
    if (!deck) return false;

    Object.assign(deck, updates);
    this.saveDecksToStorage();
    this.emit('deckUpdated', deck);

    return true;
  }

  deleteDeck(deckId) {
    const index = this.decks.findIndex(d => d.id === deckId);
    if (index === -1) return false;

    const deck = this.decks[index];
    
    // Move hotkeys to standalone
    const deckHotkeys = this.getHotkeysByDeck(deckId);
    deckHotkeys.forEach(hotkey => {
      hotkey.deckId = null;
      hotkey.position = null;
    });

    // Delete sub-decks
    const subDecks = this.getSubDecks(deckId);
    subDecks.forEach(subDeck => this.deleteDeck(subDeck.id));

    this.decks.splice(index, 1);
    this.saveDecksToStorage();
    this.saveHotkeysToStorage();
    this.emit('deckDeleted', deck);

    return true;
  }

  getDeckById(deckId) {
    return this.decks.find(d => d.id === deckId);
  }

  getAllDecks() {
    return [...this.decks];
  }

  getMainDecks() {
    return this.decks.filter(d => !d.isSubDeck);
  }

  getSubDecks(parentDeckId) {
    return this.decks.filter(d => d.parentDeckId === parentDeckId);
  }

  switchToDeck(deckId) {
    const deck = this.getDeckById(deckId);
    if (!deck) return false;

    this.currentDeck = deck;
    this.emit('deckSwitched', deck);

    console.log('HotkeyManager: Switched to deck:', deck.name);
    return true;
  }

  getCurrentDeck() {
    return this.currentDeck;
  }

  // ===== HOTKEY LEARNING =====

  startLearningMode(callback, targetHotkeyId = null) {
    this.isLearningMode = true;
    this.learningCallback = callback;
    this.learningTargetHotkeyId = targetHotkeyId;

    // Set up trigger listeners
    this.setupLearningListeners();

    this.emit('learningStarted', { targetHotkeyId });
    console.log('HotkeyManager: Learning mode started');
  }

  stopLearningMode() {
    this.isLearningMode = false;
    this.learningCallback = null;
    this.learningTargetHotkeyId = null;

    // Clear any pending keyboard timeout
    if (this.keyboardLearningTimeout) {
      clearTimeout(this.keyboardLearningTimeout);
      this.keyboardLearningTimeout = null;
    }
    
    this.currentKeyEvent = null;

    // Remove trigger listeners
    this.removeLearningListeners();

    this.emit('learningStopped');
    console.log('HotkeyManager: Learning mode stopped');
  }

  setupLearningListeners() {
    // MIDI learning
    if (window.midiController) {
      window.midiController.on('midiMessage', this.handleLearningMidiMessage.bind(this));
    }

    // Keyboard learning
    document.addEventListener('keydown', this.handleLearningKeyboard.bind(this));
  }

  removeLearningListeners() {
    if (window.midiController) {
      window.midiController.off('midiMessage', this.handleLearningMidiMessage.bind(this));
    }
    document.removeEventListener('keydown', this.handleLearningKeyboard.bind(this));
  }

  handleLearningMidiMessage(midiEvent) {
    if (!this.isLearningMode) return;

    const trigger = {
      type: 'midi',
      data: {
        messageType: midiEvent.type,
        channel: midiEvent.channel,
        controller: midiEvent.controller || midiEvent.note,
        value: midiEvent.value,
        description: this.getMidiDescription(midiEvent)
      }
    };

    this.handleLearningComplete(trigger);
  }

  handleLearningKeyboard(event) {
    if (!this.isLearningMode) return;

    event.preventDefault();
    event.stopPropagation();

    // Clear any existing timeout
    if (this.keyboardLearningTimeout) {
      clearTimeout(this.keyboardLearningTimeout);
    }

    // Store the current key event
    this.currentKeyEvent = {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    };

    // Wait 500ms for additional keys in combination
    this.keyboardLearningTimeout = setTimeout(() => {
      const trigger = {
        type: 'keyboard',
        data: {
          key: this.currentKeyEvent.key,
          code: this.currentKeyEvent.code,
          ctrlKey: this.currentKeyEvent.ctrlKey,
          shiftKey: this.currentKeyEvent.shiftKey,
          altKey: this.currentKeyEvent.altKey,
          metaKey: this.currentKeyEvent.metaKey,
          description: this.getKeyboardDescription(this.currentKeyEvent)
        }
      };

      this.handleLearningComplete(trigger);
    }, 500);
  }

  handleLearningComplete(trigger) {
    if (this.learningCallback) {
      this.learningCallback(trigger);
    }

    this.stopLearningMode();
  }

  getMidiDescription(midiEvent) {
    const type = midiEvent.type === 'controlchange' ? 'CC' : 
                 midiEvent.type === 'noteon' ? 'Note' : 
                 midiEvent.type === 'noteoff' ? 'Note' : midiEvent.type;
    
    const controller = midiEvent.controller || midiEvent.note || 0;
    return `${type} ${controller} (CH${midiEvent.channel + 1})`;
  }

  getKeyboardDescription(event) {
    const modifiers = [];
    if (event.metaKey) modifiers.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Win');
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    
    let keyName = event.key || event.code || 'Unknown';
    
    // Safety check to prevent undefined errors
    if (!keyName || typeof keyName !== 'string') {
      keyName = 'Unknown';
    }
    
    // Special key names for better readability
    const specialKeys = {
      ' ': 'Space',
      'ArrowUp': '↑',
      'ArrowDown': '↓', 
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Enter': '⏎',
      'Escape': 'Esc',
      'Backspace': '⌫',
      'Delete': 'Del',
      'Tab': '⇥'
    };
    
    if (specialKeys[keyName]) {
      keyName = specialKeys[keyName];
    } else if (keyName.length === 1) {
      keyName = keyName.toUpperCase();
    }
    
    return modifiers.length > 0 ? `${modifiers.join('+')}+${keyName}` : keyName;
  }

  // ===== TRIGGER HANDLING =====

  setupEventListeners() {
    // MIDI triggers
    if (window.midiController) {
      window.midiController.on('midiMessage', this.handleMidiTrigger.bind(this));
    }

    // Keyboard triggers
    document.addEventListener('keydown', this.handleKeyboardTrigger.bind(this));
  }

  handleMidiTrigger(midiEvent) {
    if (this.isLearningMode) return;

    const matchingHotkeys = this.hotkeys.filter(hotkey => 
      hotkey.enabled && 
      hotkey.triggers.some(trigger => 
        trigger.type === 'midi' && 
        this.midiTriggerMatches(trigger.data, midiEvent)
      )
    );

    matchingHotkeys.forEach(hotkey => this.executeHotkey(hotkey.id));
  }

  handleKeyboardTrigger(event) {
    if (this.isLearningMode) return;

    const matchingHotkeys = this.hotkeys.filter(hotkey => 
      hotkey.enabled && 
      hotkey.triggers.some(trigger => 
        trigger.type === 'keyboard' && 
        this.keyboardTriggerMatches(trigger.data, event)
      )
    );

    if (matchingHotkeys.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      matchingHotkeys.forEach(hotkey => this.executeHotkey(hotkey.id));
    }
  }

  midiTriggerMatches(triggerData, midiEvent) {
    return triggerData.messageType === midiEvent.type &&
           triggerData.channel === midiEvent.channel &&
           triggerData.controller === (midiEvent.controller || midiEvent.note);
  }

  keyboardTriggerMatches(triggerData, event) {
    return triggerData.code === event.code &&
           triggerData.ctrlKey === event.ctrlKey &&
           triggerData.shiftKey === event.shiftKey &&
           triggerData.altKey === event.altKey;
  }

  // ===== HAPTIC FEEDBACK =====

  triggerHapticFeedback() {
    // Vibration for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }

    // Visual feedback
    this.emit('hapticFeedback');
  }

  // ===== STORAGE =====

  saveHotkeysToStorage() {
    if (window.settingsManager) {
      window.settingsManager.set('hotkeys.list', this.hotkeys);
    }
  }

  loadHotkeysFromStorage() {
    if (window.settingsManager) {
      this.hotkeys = window.settingsManager.get('hotkeys.list', []);
    }
  }

  saveDecksToStorage() {
    if (window.settingsManager) {
      window.settingsManager.set('hotkeys.decks', this.decks);
    }
  }

  loadDecksFromStorage() {
    if (window.settingsManager) {
      this.decks = window.settingsManager.get('hotkeys.decks', []);
    }
  }

  // ===== UTILITIES =====

  generateId() {
    return 'hk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== EVENT EMITTER =====

  on(event, callback) {
    if (!this.events) this.events = {};
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events || !this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events || !this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }

  // ===== PUBLIC API =====

  getStats() {
    return {
      totalHotkeys: this.hotkeys.length,
      enabledHotkeys: this.hotkeys.filter(h => h.enabled).length,
      totalDecks: this.decks.length,
      currentDeck: this.currentDeck?.name || 'None',
      totalExecutions: this.hotkeys.reduce((sum, h) => sum + h.triggerCount, 0),
      averageActionsPerHotkey: this.hotkeys.length > 0 ? 
        this.hotkeys.reduce((sum, h) => sum + h.actions.length, 0) / this.hotkeys.length : 0
    };
  }

  exportConfiguration() {
    return {
      hotkeys: this.hotkeys,
      decks: this.decks,
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
  }

  importConfiguration(config) {
    if (config.version !== '1.0') {
      throw new Error('Unsupported configuration version');
    }

    this.hotkeys = config.hotkeys || [];
    this.decks = config.decks || [];
    
    this.saveHotkeysToStorage();
    this.saveDecksToStorage();
    
    this.emit('configurationImported');
  }
}

// Export for global access
console.log('HotkeyManager: Enhanced hotkey system loaded');
window.HotkeyManager = HotkeyManager;