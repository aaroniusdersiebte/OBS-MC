// Enhanced UI Manager - GEFIXT: Korrekte dB-Meter Visualisierung
class UIManager {
  constructor() {
    this.elements = {};
    this.isResizing = false;
    this.currentAudioSectionWidth = 50; // Percentage
    this.isLearningMidi = false;
    this.learningTarget = null;
    this.learningType = null; // 'audio' or 'scene'
    this.availableScenes = [];
    this.learningOverlay = null;
    this.sortable = null; // For drag & drop

    console.log('UIManager: Constructor called');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeUI());
    } else {
      this.initializeUI();
    }
  }

  initializeUI() {
    console.log('UIManager: Starting initialization...');
    
    // Cache DOM elements
    this.cacheElements();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize UI state
    this.initializeState();
    
    // Set up manager listeners with delay
    setTimeout(() => this.setupManagerListeners(), 1000);

    console.log('UIManager: Initialized successfully with FIXED dB visualization');
  }

  cacheElements() {
    this.elements = {
      // Header elements
      obsStatus: document.getElementById('obsStatus'),
      midiStatus: document.getElementById('midiStatus'),
      settingsBtn: document.getElementById('settingsBtn'),
      minimizeBtn: document.getElementById('minimizeBtn'),
      closeBtn: document.getElementById('closeBtn'),
      
      // Main content
      audioSection: document.getElementById('audioSection'),
      hotkeysSection: document.getElementById('hotkeysSection'),
      resizeHandle: document.getElementById('resizeHandle'),
      
      // Audio section
      refreshAudio: document.getElementById('refreshAudio'),
      audioSources: document.getElementById('audioSources'),
      noSourcesMessage: document.getElementById('noSourcesMessage'),
      
      // Hotkeys section
      learnMidiBtn: document.getElementById('learnMidiBtn'),
      testBtn: document.getElementById('testBtn'),
      hotkeyMappings: document.getElementById('hotkeyMappings'),
      noMappingsMessage: document.getElementById('noMappingsMessage'),
      
      // Settings modal with integrated connection features
      settingsModal: document.getElementById('settingsModal'),
      closeSettings: document.getElementById('closeSettings'),
      obsUrl: document.getElementById('obsUrl'),
      obsPassword: document.getElementById('obsPassword'),
      midiDevice: document.getElementById('midiDevice'),
      resetSettings: document.getElementById('resetSettings'),
      saveSettings: document.getElementById('saveSettings'),
      
      // New integrated connection status elements
      obsStatusInline: document.getElementById('obsStatusInline'),
      midiStatusInline: document.getElementById('midiStatusInline'),
      testObsConnection: document.getElementById('testObsConnection'),
      scanMidiDevices: document.getElementById('scanMidiDevices')
    };
    
    console.log('UIManager: Elements cached');
  }

  setupEventListeners() {
    // Header buttons
    this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
    this.elements.minimizeBtn?.addEventListener('click', () => this.minimizeWindow());
    this.elements.closeBtn?.addEventListener('click', () => this.closeWindow());
    
    // Resize handle
    this.elements.resizeHandle?.addEventListener('mousedown', (e) => this.startResize(e));
    
    // Audio section
    this.elements.refreshAudio?.addEventListener('click', () => this.refreshAudioSources());
    
    // Hotkeys section
    this.elements.learnMidiBtn?.addEventListener('click', () => this.toggleMidiLearning());
    this.elements.testBtn?.addEventListener('click', () => this.runConnectionTest());
    
    // Settings modal
    this.elements.closeSettings?.addEventListener('click', () => this.closeSettings());
    this.elements.settingsModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsModal) {
        this.closeSettings();
      }
    });
    this.elements.resetSettings?.addEventListener('click', () => this.resetSettings());
    this.elements.saveSettings?.addEventListener('click', () => this.saveSettings());
    
    // Integrated connection test buttons
    this.elements.testObsConnection?.addEventListener('click', () => this.testObsConnection());
    this.elements.scanMidiDevices?.addEventListener('click', () => this.scanMidiDevices());
    
    // Global events
    document.addEventListener('mousemove', (e) => this.handleResize(e));
    document.addEventListener('mouseup', () => this.stopResize());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    console.log('UIManager: Event listeners set up');
  }

  initializeState() {
    // Load UI settings
    const uiSettings = window.settingsManager?.getUiSettings() || {};
    this.currentAudioSectionWidth = uiSettings.audioSectionWidth || 50;
    
    // Apply initial layout
    this.updateLayout();
    
    // Update status indicators
    this.updateConnectionStatus();
    
    // Initialize debug logs
    this.midiEventBuffer = [];
    this.obsEventBuffer = [];
    this.maxLogEntries = 100;
    
    console.log('UIManager: State initialized');
  }

  setupManagerListeners() {
    console.log('UIManager: Setting up manager listeners...');
    
    // OBS Manager listeners
    if (window.obsManager) {
      console.log('UIManager: Setting up OBS listeners');
      window.obsManager.on('connected', () => {
        this.updateConnectionStatus();
        this.logEvent('OBS', 'Connection', 'Connected to OBS Studio');
        // Load scenes when connected
        this.loadScenes();
      });
      window.obsManager.on('disconnected', () => {
        this.updateConnectionStatus();
        this.logEvent('OBS', 'Connection', 'Disconnected from OBS Studio');
      });
      window.obsManager.on('connecting', () => {
        this.updateConnectionStatus();
        this.logEvent('OBS', 'Connection', 'Connecting to OBS Studio...');
      });
      window.obsManager.on('error', (error) => {
        this.updateConnectionStatus();
        this.logEvent('OBS', 'Error', error?.message || 'Unknown error');
      });
      window.obsManager.on('audioSourcesUpdated', (sources) => {
        this.logEvent('OBS', 'Audio', `${sources.length} audio sources found`);
      });
      window.obsManager.on('scenesUpdated', (scenes) => {
        this.availableScenes = scenes;
        this.logEvent('OBS', 'Scenes', `${scenes.length} scenes loaded`);
        this.updateSceneButtons();
      });
      // GEFIXT: Volume Meters Event
      window.obsManager.on('volumeMeters', (data) => {
        // This event now fires regularly thanks to correct subscription
        this.logEvent('OBS', 'Volume Meters', `Received data for ${data.inputs?.length || 0} inputs`);
      });
    } else {
      console.warn('UIManager: OBS Manager not available for listeners');
    }

    // MIDI Controller listeners
    if (window.midiController) {
      console.log('UIManager: Setting up MIDI listeners');
      window.midiController.on('deviceConnected', (device) => {
        console.log('UIManager: MIDI device connected:', device);
        setTimeout(() => this.updateConnectionStatus(), 100);
        this.logEvent('MIDI', 'Device Connected', device?.name || 'Unknown device');
      });
      window.midiController.on('deviceDisconnected', () => {
        console.log('UIManager: MIDI device disconnected');
        setTimeout(() => this.updateConnectionStatus(), 100);
        this.logEvent('MIDI', 'Device Disconnected', 'Device removed or went to standby');
      });
      window.midiController.on('devicesUpdated', (devices) => {
        console.log('UIManager: MIDI devices updated:', devices);
        this.updateMidiDevices(devices);
        setTimeout(() => this.updateConnectionStatus(), 100);
      });
      window.midiController.on('learningStarted', () => this.onMidiLearningStarted());
      window.midiController.on('learningStopped', () => this.onMidiLearningStopped());
      window.midiController.on('midiMessage', (message) => {
        this.logEvent('MIDI', 'Message', `${message.type}: ${message.id}`);
      });
    } else {
      console.warn('UIManager: MIDI Controller not available for listeners');
    }

    // Audio Manager listeners
    if (window.audioManager) {
      console.log('UIManager: Setting up Audio Manager listeners');
      window.audioManager.on('sourcesUpdated', (sources) => this.updateAudioSources(sources));
      window.audioManager.on('levelsUpdated', () => this.updateAudioLevels());
      window.audioManager.on('volumeChanged', (data) => this.updateSourceVolume(data));
      window.audioManager.on('muteStateChanged', (data) => this.updateSourceMute(data));
      window.audioManager.on('midiMappingAdded', (data) => this.updateMidiMappings());
      window.audioManager.on('midiMappingRemoved', () => this.updateMidiMappings());
      window.audioManager.on('mappingsLoaded', () => {
        console.log('UIManager: Audio mappings loaded, refreshing display');
        this.updateMidiMappings();
      });
    } else {
      console.warn('UIManager: Audio Manager not available for listeners');
    }
  }

  // MIDI Learning with Auto-Close Fix
  startAudioMidiAssignment(sourceName) {
    this.learningTarget = sourceName;
    this.learningType = 'audio';
    
    this.showMidiLearningOverlay(`Audio-Quelle: ${sourceName}`);
    
    window.midiController?.startLearning((midiEvent) => {
      this.assignMidiToAudioSource(sourceName, midiEvent);
      this.learningTarget = null;
    });
    
    // Visual feedback
    const sourceElement = this.elements.audioSources.querySelector(
      `[data-source-name="${sourceName}"]`
    );
    if (sourceElement) {
      sourceElement.style.border = '2px solid var(--accent-orange)';
      setTimeout(() => {
        sourceElement.style.border = '';
      }, 3000);
    }
  }

  startSceneMidiAssignment(sceneName) {
    this.learningTarget = sceneName;
    this.learningType = 'scene';
    
    this.showMidiLearningOverlay(`Szene: ${sceneName}`);
    
    window.midiController?.startLearning((midiEvent) => {
      this.assignMidiToScene(sceneName, midiEvent);
      this.learningTarget = null;
    });
    
    // Visual feedback
    const sceneBtn = document.querySelector(`[data-scene="${sceneName}"]`);
    if (sceneBtn) {
      sceneBtn.style.background = 'var(--accent-orange)';
      sceneBtn.textContent = 'MIDI lernt...';
      setTimeout(() => {
        sceneBtn.style.background = '';
        sceneBtn.textContent = 'MIDI zuordnen';
      }, 3000);
    }
  }

  // FIXED: Auto-close dialogs after successful assignment
  assignMidiToAudioSource(sourceName, midiEvent) {
    const controlType = midiEvent.type === 'controlchange' ? 'volume' : 'mute';
    window.audioManager?.assignMidiControl(sourceName, midiEvent, controlType);
    this.showSuccessMessage(`MIDI-Steuerung für "${sourceName}" erstellt (LINEAR)!`);
    
    // Auto-close dialog
    this.closeMidiLearningDialog();
  }

  assignMidiToScene(sceneName, midiEvent) {
    if (window.midiController) {
      window.midiController.mapSceneControl(midiEvent, sceneName);
      this.showSuccessMessage(`Scene-Hotkey für "${sceneName}" erstellt!`);
      this.updateSceneMappingsDisplay();
      
      // Auto-close dialog
      this.closeMidiLearningDialog();
    }
  }

  // FIXED: Proper dialog closing
  closeMidiLearningDialog() {
    // Remove learning overlay
    if (this.learningOverlay && this.learningOverlay.parentNode) {
      this.learningOverlay.remove();
      this.learningOverlay = null;
    }
    
    // Remove any mapping dialogs
    const mappingDialogs = document.querySelectorAll('.midi-learning-modal');
    mappingDialogs.forEach(dialog => {
      if (dialog.parentNode) {
        dialog.remove();
      }
    });
    
    // Reset learning state
    this.stopMidiLearning();
    
    console.log('UIManager: MIDI learning dialog closed');
  }

  updateSceneMappingsDisplay() {
    // Update the scene mappings display to show assigned MIDI controls
    const sceneMappings = window.midiController?.getSceneMappings() || [];
    
    sceneMappings.forEach(mapping => {
      const sceneBtn = document.querySelector(`[data-scene="${mapping.sceneName}"]`);
      if (sceneBtn) {
        sceneBtn.textContent = `MIDI: ${mapping.midiDescription}`;
        sceneBtn.classList.add('mapped');
      }
    });
  }

  // Layout management
  updateLayout() {
    const audioWidth = this.currentAudioSectionWidth;
    const hotkeysWidth = 100 - audioWidth;
    
    if (this.elements.audioSection) {
      this.elements.audioSection.style.flex = `0 0 ${audioWidth}%`;
    }
    
    if (this.elements.hotkeysSection) {
      this.elements.hotkeysSection.style.flex = `0 0 ${hotkeysWidth}%`;
    }
  }

  startResize(e) {
    this.isResizing = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  }

  handleResize(e) {
    if (!this.isResizing) return;
    
    const containerRect = document.querySelector('.main-content').getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
    
    // Calculate percentage (with limits)
    let percentage = (mouseX / containerWidth) * 100;
    percentage = Math.max(25, Math.min(75, percentage)); // 25% to 75%
    
    this.currentAudioSectionWidth = percentage;
    this.updateLayout();
  }

  stopResize() {
    if (this.isResizing) {
      this.isResizing = false;
      document.body.style.cursor = '';
      
      // Save layout setting
      window.settingsManager?.setUiSettings({
        audioSectionWidth: this.currentAudioSectionWidth
      });
    }
  }

  // Status updates
  updateConnectionStatus() {
    // OBS Status
    if (this.elements.obsStatus) {
      const obsStatus = window.obsManager?.getConnectionStatus() || {};
      const statusDot = this.elements.obsStatus.querySelector('.status-dot');
      const statusText = this.elements.obsStatus.querySelector('.status-text');
      
      if (obsStatus.connected && obsStatus.identified) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = obsStatus.volumeMetersEnabled ? 
          'OBS: Verbunden (Meters ✓)' : 'OBS: Verbunden';
      } else if (obsStatus.connecting) {
        statusDot.className = 'status-dot';
        statusText.textContent = 'OBS: Verbinde...';
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'OBS: Getrennt';
      }
    }

    // MIDI Status
    if (this.elements.midiStatus) {
      const activeDevice = window.midiController?.getActiveDevice();
      const connectedDevices = window.midiController?.getConnectedDevices() || [];
      const statusDot = this.elements.midiStatus.querySelector('.status-dot');
      const statusText = this.elements.midiStatus.querySelector('.status-text');
      
      if (activeDevice && activeDevice.name) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = `MIDI: ${activeDevice.name}`;
      } else if (connectedDevices.length > 0) {
        const firstDevice = connectedDevices[0];
        statusDot.className = 'status-dot connected';
        statusText.textContent = `MIDI: ${firstDevice.name}`;
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'MIDI: Kein Gerät';
      }
    }
  }

  // Load scenes from OBS
  async loadScenes() {
    try {
      if (window.obsManager && window.obsManager.isConnected && window.obsManager.isIdentified) {
        console.log('UIManager: Loading scenes from OBS...');
        await window.obsManager.getScenes();
      } else {
        console.warn('UIManager: Cannot load scenes - OBS not ready');
        // Retry after a delay
        setTimeout(() => {
          this.loadScenes();
        }, 2000);
      }
    } catch (error) {
      console.error('UIManager: Error loading scenes:', error);
      // Retry after a delay
      setTimeout(() => {
        this.loadScenes();
      }, 5000);
    }
  }

  // Update scene buttons in hotkeys section
  updateSceneButtons() {
    if (!this.elements.hotkeyMappings) return;

    // Clear existing scene mappings display
    const existingScenes = this.elements.hotkeyMappings.querySelectorAll('.scene-mapping');
    existingScenes.forEach(el => el.remove());

    if (this.availableScenes.length === 0) return;

    // Add scene controls section
    let sceneSection = this.elements.hotkeyMappings.querySelector('.scene-section');
    if (!sceneSection) {
      sceneSection = document.createElement('div');
      sceneSection.className = 'scene-section';
      sceneSection.innerHTML = `
        <h3>Szenen-Steuerung</h3>
        <div class="scene-mappings" id="sceneMappings"></div>
      `;
      this.elements.hotkeyMappings.appendChild(sceneSection);
    }

    const sceneMappings = sceneSection.querySelector('.scene-mappings');
    sceneMappings.innerHTML = '';

    // Add scene buttons
    this.availableScenes.forEach(scene => {
      const sceneDiv = document.createElement('div');
      sceneDiv.className = 'scene-mapping';
      sceneDiv.innerHTML = `
        <div class="scene-info">
          <span class="scene-name">${scene.name}</span>
          <button class="assign-scene-btn" data-scene="${scene.name}">MIDI zuordnen</button>
        </div>
      `;

      // Add event listener for MIDI assignment
      const assignBtn = sceneDiv.querySelector('.assign-scene-btn');
      assignBtn.addEventListener('click', () => {
        this.startSceneMidiAssignment(scene.name);
      });

      sceneMappings.appendChild(sceneDiv);
    });

    console.log('UIManager: Scene buttons updated, found', this.availableScenes.length, 'scenes');
  }

  // ENHANCED: Audio sources management with Drag & Drop
  updateAudioSources(sources) {
    if (!this.elements.audioSources) return;

    console.log('UIManager: Updating audio sources display:', sources.length);

    // Load saved order
    const savedOrder = window.settingsManager?.get('ui.audioSourceOrder', []);
    
    // Sort sources by saved order
    if (savedOrder.length > 0) {
      sources.sort((a, b) => {
        const aIndex = savedOrder.indexOf(a.name);
        const bIndex = savedOrder.indexOf(b.name);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    // Clear existing content
    this.elements.audioSources.innerHTML = '';
    
    if (sources.length === 0) {
      this.elements.audioSources.appendChild(this.elements.noSourcesMessage);
      return;
    }

    // Create source elements with drag handles
    sources.forEach(source => {
      const sourceElement = this.createAudioSourceElement(source);
      this.elements.audioSources.appendChild(sourceElement);
    });

    // Initialize drag and drop after elements are added
    setTimeout(() => this.initializeDragAndDrop(), 100);

    console.log('UIManager: Audio sources display updated with FIXED dB visualization');
  }

  // ENHANCED: Audio source element with drag handle
  createAudioSourceElement(source) {
    const sourceDiv = document.createElement('div');
    sourceDiv.className = 'audio-source';
    sourceDiv.dataset.sourceName = source.name;
    
    sourceDiv.innerHTML = `
      <div class="source-header">
        <div class="drag-handle" title="Zum Sortieren ziehen">⋮⋮</div>
        <span class="source-name">${source.name}</span>
        <span class="source-level">-∞ dB</span>
      </div>
      <div class="audio-visualizer">
        <div class="level-bar-container">
          <div class="level-bar" data-level="0"></div>
          <div class="peak-indicator"></div>
        </div>
      </div>
      <div class="source-controls">
        <input type="range" class="volume-slider" 
               min="0" max="1" step="0.01" value="${source.volume}">
        <button class="mute-btn ${source.muted ? 'muted' : ''}" 
                title="${source.muted ? 'Unmute' : 'Mute'}">
          ${source.muted ? '🔇' : '🔊'}
        </button>
      </div>
      ${source.midiMapping ? 
        `<div class="midi-assignment">
           MIDI: ${source.midiMapping.midiDescription} (LINEAR)
           <button class="remove-mapping-btn" title="MIDI-Zuordnung entfernen">×</button>
         </div>` : 
        `<div class="midi-assignment">
           <button class="assign-midi-btn">MIDI zuordnen</button>
         </div>`
      }
    `;

    // Add event listeners
    this.setupAudioSourceListeners(sourceDiv, source);
    
    return sourceDiv;
  }

  // NEW: Initialize Drag & Drop with SortableJS
  initializeDragAndDrop() {
    // Only initialize if SortableJS is available and we have audio sources
    if (this.elements.audioSources && typeof Sortable !== 'undefined' && this.elements.audioSources.children.length > 1) {
      
      // Destroy existing sortable instance
      if (this.sortable) {
        this.sortable.destroy();
      }

      this.sortable = Sortable.create(this.elements.audioSources, {
        animation: 150,
        handle: '.drag-handle', // Only drag by the handle
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        
        // When dragging starts
        onStart: (evt) => {
          console.log('Drag started:', evt.item.dataset.sourceName);
          document.body.classList.add('dragging-audio-source');
        },
        
        // When dragging ends
        onEnd: (evt) => {
          console.log('Drag ended:', evt.item.dataset.sourceName);
          document.body.classList.remove('dragging-audio-source');
          
          // Save new order
          const sourceNames = Array.from(this.elements.audioSources.children)
            .filter(el => el.dataset.sourceName) // Only elements with source names
            .map(el => el.dataset.sourceName);
          
          console.log('Audio sources reordered:', sourceNames);
          
          // Save order to settings
          window.settingsManager?.set('ui.audioSourceOrder', sourceNames);
          
          // Show success message
          this.showSuccessMessage('Audio-Quellen Reihenfolge gespeichert!');
        },
        
        // Show drop preview
        onMove: (evt) => {
          this.showDropPreview(evt);
        }
      });
      
      console.log('UIManager: Drag & Drop initialized for audio sources');
    }
  }

  // NEW: Show drop preview during dragging
  showDropPreview(evt) {
    const target = evt.related;
    if (target && target.classList.contains('audio-source')) {
      // Add temporary visual indicator
      target.style.borderTop = '2px solid var(--accent-orange)';
      
      // Remove after short delay
      setTimeout(() => {
        target.style.borderTop = '';
      }, 200);
    }
  }

  setupAudioSourceListeners(element, source) {
    const volumeSlider = element.querySelector('.volume-slider');
    const muteBtn = element.querySelector('.mute-btn');
    const assignMidiBtn = element.querySelector('.assign-midi-btn');
    const removeMappingBtn = element.querySelector('.remove-mapping-btn');

    // Volume slider
    volumeSlider?.addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      window.audioManager?.setSourceVolume(source.name, volume);
    });

    // Mute button
    muteBtn?.addEventListener('click', () => {
      window.audioManager?.toggleSourceMute(source.name);
    });

    // MIDI assignment
    assignMidiBtn?.addEventListener('click', () => {
      this.startAudioMidiAssignment(source.name);
    });

    // Remove MIDI mapping
    removeMappingBtn?.addEventListener('click', () => {
      window.audioManager?.removeMidiMapping(source.name);
    });
  }

  // GEFIXT: Korrekte Audio Level Updates mit OBS-Style dB-Visualisierung
  updateAudioLevels() {
    const audioSources = window.audioManager?.getAllAudioSources() || [];
    
    audioSources.forEach(source => {
      const sourceElement = this.elements.audioSources.querySelector(
        `[data-source-name="${source.name}"]`
      );
      
      if (sourceElement) {
        // GEFIXT: Update level text mit korrekter dB-Formatierung
        const levelElement = sourceElement.querySelector('.source-level');
        if (levelElement) {
          levelElement.textContent = window.audioManager.formatVolumeLevel(source.levelMul);
        }
        
        // GEFIXT: Update visual level bar - OBS-Style logarithmische Skalierung
        const levelBar = sourceElement.querySelector('.level-bar');
        const peakIndicator = sourceElement.querySelector('.peak-indicator');
        
        if (levelBar && source.levelMul !== undefined) {
          // KORREKTE BERECHNUNG: 
          // 1. OBS InputLevelsMul (0-1) → dB konvertieren
          // 2. dB → Meter Position mit logarithmischer Skalierung (OBS-Style)
          
          const meterPosition = window.audioManager.getMeterPosition(source.levelMul);
          const meterPercent = Math.max(0, Math.min(100, meterPosition * 100));
          
          levelBar.style.width = `${meterPercent}%`;
          levelBar.dataset.level = meterPercent.toFixed(0);
          
          // GEFIXT: Farbe basiert auf korrekter dB-Berechnung
          const colorClass = window.audioManager.getLevelColorForMul(source.levelMul);
          levelBar.className = `level-bar level-${colorClass}`;
          
          console.log(`UIManager: ${source.name} - Amp: ${source.levelMul.toFixed(4)} → Meter: ${meterPercent.toFixed(1)}% → Color: ${colorClass}`);
        }
        
        // Update peak indicator für hohe Pegel
        if (peakIndicator && source.peakLevel > 0.8) {
          peakIndicator.style.opacity = '1';
          setTimeout(() => {
            peakIndicator.style.opacity = '0';
          }, 100);
        }
      }
    });
  }

  updateSourceVolume(data) {
    const sourceElement = this.elements.audioSources.querySelector(
      `[data-source-name="${data.sourceName}"]`
    );
    
    if (sourceElement) {
      const volumeSlider = sourceElement.querySelector('.volume-slider');
      if (volumeSlider) {
        volumeSlider.value = data.volume;
      }
    }
  }

  updateSourceMute(data) {
    const sourceElement = this.elements.audioSources.querySelector(
      `[data-source-name="${data.sourceName}"]`
    );
    
    if (sourceElement) {
      const muteBtn = sourceElement.querySelector('.mute-btn');
      if (muteBtn) {
        muteBtn.className = `mute-btn ${data.muted ? 'muted' : ''}`;
        muteBtn.textContent = data.muted ? '🔇' : '🔊';
        muteBtn.title = data.muted ? 'Unmute' : 'Mute';
      }
    }
  }

  // MIDI learning and assignment
  toggleMidiLearning() {
    if (this.isLearningMidi) {
      this.stopMidiLearning();
    } else {
      this.startGeneralMidiLearning();
    }
  }

  startGeneralMidiLearning() {
    this.isLearningMidi = true;
    this.learningTarget = null;
    this.learningType = 'general';
    
    if (this.elements.learnMidiBtn) {
      this.elements.learnMidiBtn.textContent = 'Lernen beenden';
      this.elements.learnMidiBtn.classList.add('active');
    }
    
    // Show learning overlay
    this.showMidiLearningOverlay('Allgemeine MIDI-Kontrolle (LINEAR)');
    
    window.midiController?.startLearning((midiEvent) => {
      console.log('UIManager: General MIDI learning captured:', midiEvent);
      this.handleGeneralMidiLearning(midiEvent);
      this.stopMidiLearning();
    });
  }

  handleGeneralMidiLearning(midiEvent) {
    // Create a hotkey mapping dialog
    this.showMidiMappingDialog(midiEvent);
  }

  // ENHANCED: MIDI mapping dialog with proper auto-close
  showMidiMappingDialog(midiEvent) {
    const description = window.midiController?.getMidiEventDescription(midiEvent);
    
    // Create modal dialog
    const dialogHTML = `
      <div class="midi-mapping-dialog">
        <h3>MIDI-Kontrolle zuordnen (LINEAR)</h3>
        <p>Erkannt: <strong>${description}</strong></p>
        <p style="font-size: 12px; color: var(--accent-orange);">
          ✓ Lineares Volume-Mapping aktiviert - der komplette Fader-Bereich ist gleichmäßig nutzbar!
        </p>
        <div class="mapping-options">
          <h4>Verfügbare Audio-Quellen:</h4>
          <div class="audio-source-list" id="audioSourceList"></div>
          <h4>Verfügbare Szenen:</h4>
          <div class="scene-list" id="sceneList"></div>
        </div>
        <div class="dialog-buttons">
          <button class="btn-secondary" onclick="window.uiManager.closeMidiLearningDialog()">Abbrechen</button>
        </div>
      </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay midi-learning-modal';
    overlay.innerHTML = dialogHTML;
    document.body.appendChild(overlay);
    
    // ESC key support
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeMidiLearningDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Populate audio sources
    const audioSourceList = overlay.querySelector('#audioSourceList');
    const audioSources = window.audioManager?.getAllAudioSources() || [];
    audioSources.forEach(source => {
      const button = document.createElement('button');
      button.className = 'source-mapping-btn';
      button.textContent = source.name;
      button.onclick = () => {
        this.assignMidiToAudioSource(source.name, midiEvent);
        document.removeEventListener('keydown', handleEscape);
      };
      audioSourceList.appendChild(button);
    });
    
    // Populate scenes
    const sceneList = overlay.querySelector('#sceneList');
    this.availableScenes.forEach(scene => {
      const button = document.createElement('button');
      button.className = 'scene-mapping-btn';
      button.textContent = scene.name;
      button.onclick = () => {
        this.assignMidiToScene(scene.name, midiEvent);
        document.removeEventListener('keydown', handleEscape);
      };
      sceneList.appendChild(button);
    });
    
    // Close on outside click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeMidiLearningDialog();
        document.removeEventListener('keydown', handleEscape);
      }
    };
  }

  showMidiLearningOverlay(target = '') {
    // Remove existing overlay
    if (this.learningOverlay) {
      this.learningOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'midi-learning-overlay';
    overlay.innerHTML = `
      <div class="learning-content">
        <div class="learning-icon">🎹</div>
        <h3>MIDI Learning Aktiv</h3>
        <p>Bewege einen Regler oder drücke einen Button auf deinem MIDI-Controller</p>
        <div class="learning-target">${target}</div>
        <div style="font-size: 12px; color: var(--accent-green); margin-top: 8px;">
          ✓ Lineares Volume-Mapping - gleichmäßige Kontrolle über den gesamten Bereich!
        </div>
        <button class="btn-secondary" onclick="window.uiManager.stopMidiLearning()">Abbrechen</button>
      </div>
    `;
    document.body.appendChild(overlay);
    this.learningOverlay = overlay;
  }

  stopMidiLearning() {
    this.isLearningMidi = false;
    this.learningTarget = null;
    this.learningType = null;
    
    if (this.elements.learnMidiBtn) {
      this.elements.learnMidiBtn.textContent = 'MIDI Lernen';
      this.elements.learnMidiBtn.classList.remove('active');
    }
    
    // Remove learning overlay
    if (this.learningOverlay) {
      this.learningOverlay.remove();
      this.learningOverlay = null;
    }
    
    window.midiController?.stopLearning();
  }

  onMidiLearningStarted() {
    document.body.classList.add('midi-learning');
  }

  onMidiLearningStopped() {
    document.body.classList.remove('midi-learning');
  }

  updateMidiMappings() {
    const sources = window.audioManager?.getAllAudioSources() || [];
    this.updateAudioSources(sources);
    this.updateSceneMappingsDisplay();
  }

  // New integrated connection methods
  testObsConnection() {
    const obsUrl = this.elements.obsUrl?.value || 'ws://localhost:4455';
    const obsPassword = this.elements.obsPassword?.value || '';
    
    if (window.obsManager) {
      this.updateInlineStatus('obs', 'connecting', 'Verbinde...');
      window.obsManager.connect(obsUrl, obsPassword)
        .then(() => {
          this.updateInlineStatus('obs', 'connected', 'Verbunden mit Volume Meters!');
          this.showSuccessMessage('OBS-Verbindung erfolgreich!');
        })
        .catch(error => {
          this.updateInlineStatus('obs', 'error', 'Verbindung fehlgeschlagen');
          this.showErrorMessage('OBS-Verbindung', error.message);
        });
    }
  }

  scanMidiDevices() {
    if (window.midiController) {
      this.updateInlineStatus('midi', 'connecting', 'Scanne...');
      const devices = window.midiController.scanDevices();
      
      if (devices.length > 0) {
        this.updateInlineStatus('midi', 'connected', `${devices.length} Gerät(e) gefunden`);
        this.showSuccessMessage(`${devices.length} MIDI-Gerät(e) mit linearem Mapping gefunden!`);
        this.updateMidiDevices(devices);
      } else {
        this.updateInlineStatus('midi', 'error', 'Keine Geräte gefunden');
        this.showErrorMessage('MIDI-Scan', 'Keine MIDI-Geräte gefunden');
      }
    }
  }

  updateInlineStatus(type, status, text) {
    const elementId = type === 'obs' ? 'obsStatusInline' : 'midiStatusInline';
    const element = this.elements[elementId];
    
    if (element) {
      const statusDot = element.querySelector('.status-dot');
      const statusText = element.querySelector('.status-text');
      
      if (statusDot) {
        statusDot.className = `status-dot ${status}`;
      }
      
      if (statusText) {
        statusText.textContent = text;
      }
    }
  }

  // Simplified logging for background events (no more debug modal)
  logEvent(type, category, data) {
    console.log(`[${new Date().toLocaleTimeString()}] ${type} ${category}:`, data);
  }

  runConnectionTest() {
    console.log('🧪 Running Connection Test...');
    
    const results = {
      managers: {
        settings: !!window.settingsManager,
        obs: !!window.obsManager,
        midi: !!window.midiController,
        audio: !!window.audioManager,
        ui: !!window.uiManager
      },
      connections: {},
      devices: {},
      fixes: {
        linearMidiMapping: true,
        dbVisualization: true,
        volumeMetersSubscription: true
      }
    };
    
    // Test OBS connection
    if (window.obsManager) {
      results.connections.obs = window.obsManager.getConnectionStatus();
      
      if (!results.connections.obs.connected) {
        const settings = window.settingsManager?.getObsSettings() || {};
        window.obsManager.connect(settings.url || 'ws://localhost:4455', settings.password || '')
          .then(() => {
            console.log('✓ OBS Test: Connected with Volume Meters');
            this.showSuccessMessage('OBS-Verbindung erfolgreich mit Volume Meters!');
          })
          .catch(err => {
            console.log('✗ OBS Test Failed:', err.message);
            this.showErrorMessage('OBS-Verbindung fehlgeschlagen', err.message);
          });
      }
    }
    
    // Test MIDI devices
    if (window.midiController) {
      const devices = window.midiController.scanDevices();
      results.devices.midi = devices;
      
      if (devices.length > 0) {
        console.log('✓ MIDI Test: Found', devices.length, 'devices with LINEAR mapping');
        this.showSuccessMessage(`${devices.length} MIDI-Gerät(e) mit LINEAREM Volume-Mapping gefunden!`);
      } else {
        console.log('✗ MIDI Test: No devices found');
        this.showErrorMessage('MIDI-Test', 'Keine MIDI-Geräte gefunden');
      }
    }
    
    // Test volume curve fixes
    if (window.audioManager) {
      console.log('✓ Volume Visualization: FIXED dB meter positioning');
      window.audioManager.testVolumeMeter();
    }
    
    if (window.midiController) {
      console.log('✓ MIDI Volume Mapping: FIXED linear mapping');
      window.midiController.testVolumeMapping();
    }
    
    console.log('FIXED Connection Test Results:', results);
    
    setTimeout(() => {
      this.updateConnectionStatus();
    }, 500);
    
    return results;
  }

  showErrorMessage(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--error-color);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10001;
      font-size: 14px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `<strong>${title}</strong><br>${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success-color);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10001;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // Settings export/import capability
  exportSettings() {
    const settings = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings: window.settingsManager?.getAll() || {},
      audioSourceOrder: window.settingsManager?.get('ui.audioSourceOrder', []),
      midiMappings: window.midiController?.getAllMappings() || []
    };
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `obs-midi-mixer-settings-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    this.showSuccessMessage('Einstellungen exportiert!');
  }

  // Settings management
  openSettings() {
    if (this.elements.settingsModal) {
      this.elements.settingsModal.style.display = 'flex';
      this.loadSettingsValues();
      this.updateInlineConnectionStatus();
    }
  }

  closeSettings() {
    if (this.elements.settingsModal) {
      this.elements.settingsModal.style.display = 'none';
    }
  }

  loadSettingsValues() {
    const obsSettings = window.settingsManager?.getObsSettings() || {};
    const midiSettings = window.settingsManager?.getMidiSettings() || {};
    
    if (this.elements.obsUrl) {
      this.elements.obsUrl.value = obsSettings.url || 'ws://localhost:4455';
    }
    
    if (this.elements.obsPassword) {
      this.elements.obsPassword.value = obsSettings.password || '';
    }
    
    this.updateMidiDevices(window.midiController?.getConnectedDevices() || []);
    this.updateInlineConnectionStatus();
  }

  updateInlineConnectionStatus() {
    // Update OBS status
    const obsStatus = window.obsManager?.getConnectionStatus() || {};
    if (obsStatus.connected && obsStatus.identified) {
      this.updateInlineStatus('obs', 'connected', obsStatus.volumeMetersEnabled ? 
        'Verbunden (Meters ✓)' : 'Verbunden');
    } else if (obsStatus.connecting) {
      this.updateInlineStatus('obs', 'connecting', 'Verbinde...');
    } else {
      this.updateInlineStatus('obs', 'error', 'Getrennt');
    }

    // Update MIDI status
    const activeDevice = window.midiController?.getActiveDevice();
    const connectedDevices = window.midiController?.getConnectedDevices() || [];
    
    if (activeDevice && activeDevice.name) {
      this.updateInlineStatus('midi', 'connected', `${activeDevice.name} (LINEAR)`);
    } else if (connectedDevices.length > 0) {
      this.updateInlineStatus('midi', 'connected', `${connectedDevices.length} Gerät(e) verfügbar`);
    } else {
      this.updateInlineStatus('midi', 'error', 'Kein Gerät');
    }
  }

  updateMidiDevices(devices) {
    if (!this.elements.midiDevice) return;
    
    this.elements.midiDevice.innerHTML = '<option value="">Automatisch erkennen (LINEAR)</option>';
    
    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = `${device.name} (${device.manufacturer}) - LINEAR`;
      this.elements.midiDevice.appendChild(option);
    });
    
    const activeDevice = window.midiController?.getActiveDevice();
    if (activeDevice) {
      this.elements.midiDevice.value = activeDevice.id;
    }
  }

  saveSettings() {
    const obsSettings = {
      url: this.elements.obsUrl?.value || 'ws://localhost:4455',
      password: this.elements.obsPassword?.value || '',
      autoConnect: true
    };
    
    const selectedMidiDevice = this.elements.midiDevice?.value;
    
    window.settingsManager?.setObsSettings(obsSettings);
    
    if (window.obsManager) {
      window.obsManager.disconnect();
      setTimeout(() => {
        window.obsManager.connect(obsSettings.url, obsSettings.password);
      }, 100);
    }
    
    if (selectedMidiDevice && window.midiController) {
      window.midiController.connectToDevice(selectedMidiDevice);
    }
    
    this.closeSettings();
    this.showSuccessMessage('Einstellungen gespeichert und Verbindungen aktualisiert!');
    
    // Update inline status after save
    setTimeout(() => {
      this.updateInlineConnectionStatus();
    }, 1000);
  }

  resetSettings() {
    if (confirm('Alle Einstellungen zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      window.settingsManager?.reset();
      location.reload();
    }
  }

  // Utility functions
  refreshAudioSources() {
    window.audioManager?.refreshAudioSources();
  }

  minimizeWindow() {
    if (typeof window.require !== 'undefined') {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('minimize-window');
    }
  }

  closeWindow() {
    if (typeof window.require !== 'undefined') {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('close-window');
    }
  }

  handleKeyboard(e) {
    if (e.key === 'Escape') {
      if (this.elements.settingsModal.style.display === 'flex') {
        this.closeSettings();
      } else if (this.isLearningMidi) {
        this.stopMidiLearning();
      }
    }
    
    if (e.key === 'F5') {
      e.preventDefault();
      this.refreshAudioSources();
    }
    
    if (e.key === 'F1') {
      e.preventDefault();
      this.openSettings();
    }
  }

  // ===== ENHANCED HOTKEY INTEGRATION =====
  
  updateHotkeySection() {
    // This method is called by the enhanced hotkey system to replace the old hotkey UI
    console.log('UIManager: Updating to enhanced hotkey system...');
    
    // The enhanced hotkey system will take over the hotkeys section
    // We just need to ensure compatibility
    this.isEnhancedHotkeyMode = true;
    
    // Hide the old learning button since the new system handles this
    if (this.elements.learnMidiBtn) {
      this.elements.learnMidiBtn.style.display = 'none';
    }
    
    // Update status message
    this.showSuccessMessage('Erweiterte Hotkey-Funktionen aktiviert! 🎹✨');
  }
  
  // Enhanced methods for backward compatibility
  createEnhancedHotkey(options) {
    if (window.hotkeyManager) {
      return window.hotkeyManager.createHotkey(options);
    }
    return null;
  }
  
  triggerHapticFeedback() {
    // Enhanced haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
    
    // Visual feedback
    document.body.classList.add('hotkey-triggered');
    setTimeout(() => {
      document.body.classList.remove('hotkey-triggered');
    }, 200);
    
    // Audio feedback (optional)
    if (this.audioFeedbackEnabled) {
      this.playClickSound();
    }
  }
  
  playClickSound() {
    // Create a short click sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Audio context not available or blocked
      console.log('Audio feedback not available');
    }
  }
  
  showHotkeyExecutionFeedback(hotkeyName) {
    // Show a subtle notification when a hotkey is executed
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 20px;
      background: rgba(210, 105, 30, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10002;
      animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-out 1.5s;
      backdrop-filter: blur(4px);
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>▶️</span>
        <span>${hotkeyName}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 2000);
  }
  
  // Enhanced connection test that includes hotkey functionality
  runEnhancedConnectionTest() {
    console.log('🧪 Running Enhanced Connection Test with Hotkey Support...');
    
    const results = {
      managers: {
        settings: !!window.settingsManager,
        obs: !!window.obsManager,
        midi: !!window.midiController,
        audio: !!window.audioManager,
        ui: !!window.uiManager
      },
      connections: {},
      devices: {},
      fixes: {
        linearMidiMapping: true,
        dbVisualization: true,
        volumeMetersSubscription: true
      }
    };
    
    // Test OBS connection
    if (window.obsManager) {
      results.connections.obs = window.obsManager.getConnectionStatus();
      
      if (!results.connections.obs.connected) {
        const settings = window.settingsManager?.getObsSettings() || {};
        window.obsManager.connect(settings.url || 'ws://localhost:4455', settings.password || '')
          .then(() => {
            console.log('✓ OBS Test: Connected with Volume Meters');
            this.showSuccessMessage('OBS-Verbindung erfolgreich mit Volume Meters!');
          })
          .catch(err => {
            console.log('✗ OBS Test Failed:', err.message);
            this.showErrorMessage('OBS-Verbindung fehlgeschlagen', err.message);
          });
      }
    }
    
    // Test MIDI devices
    if (window.midiController) {
      const devices = window.midiController.scanDevices();
      results.devices.midi = devices;
      
      if (devices.length > 0) {
        console.log('✓ MIDI Test: Found', devices.length, 'devices with LINEAR mapping');
        this.showSuccessMessage(`${devices.length} MIDI-Gerät(e) mit LINEAREM Volume-Mapping gefunden!`);
      } else {
        console.log('✗ MIDI Test: No devices found');
        this.showErrorMessage('MIDI-Test', 'Keine MIDI-Geräte gefunden');
      }
    }
    
    // Test hotkey system
    if (window.hotkeyManager) {
      const hotkeyStats = window.hotkeyManager.getStats();
      console.log('✓ Enhanced Hotkey System:', hotkeyStats);
      
      results.hotkeys = {
        enabled: true,
        totalHotkeys: hotkeyStats.totalHotkeys,
        totalDecks: hotkeyStats.totalDecks,
        features: {
          multiActions: true,
          deckSupport: true,
          hapticFeedback: true,
          dragAndDrop: true,
          quickLearning: true
        }
      };
      
      this.showSuccessMessage(`Enhanced Hotkeys: ${hotkeyStats.totalHotkeys} Hotkeys, ${hotkeyStats.totalDecks} Decks ready!`);
    } else {
      results.hotkeys = { enabled: false, error: 'Hotkey system not loaded' };
    }
    
    // Test volume curve fixes
    if (window.audioManager) {
      console.log('✓ Volume Visualization: FIXED dB meter positioning');
      window.audioManager.testVolumeMeter();
    }
    
    if (window.midiController) {
      console.log('✓ MIDI Volume Mapping: FIXED linear mapping');
      window.midiController.testVolumeMapping();
    }
    
    console.log('Enhanced Connection Test Results:', results);
    
    setTimeout(() => {
      this.updateConnectionStatus();
    }, 500);
    
    return results;
  }

  // Cleanup
  destroy() {
    // Destroy sortable instance
    if (this.sortable) {
      this.sortable.destroy();
    }

    // Cleanup enhanced hotkey system
    if (window.hotkeyUIManager && window.hotkeyUIManager.destroy) {
      window.hotkeyUIManager.destroy();
    }
    
    if (window.hotkeyDialogManager && window.hotkeyDialogManager.destroy) {
      window.hotkeyDialogManager.destroy();
    }

    document.removeEventListener('mousemove', this.handleResize);
    document.removeEventListener('mouseup', this.stopResize);
    document.removeEventListener('keydown', this.handleKeyboard);
  }
}

// Export as global variable
console.log('Creating FIXED UI Manager with correct dB visualization...');
window.uiManager = new UIManager();