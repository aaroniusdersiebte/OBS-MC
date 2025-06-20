// Enhanced Hotkey System Test Utility
window.testHotkeySystem = function() {
  console.log('🧪 Testing Enhanced Hotkey System...');
  
  const results = {
    timestamp: new Date().toISOString(),
    components: {},
    functionality: {},
    demos: []
  };
  
  // Test component loading
  results.components = {
    hotkeyManager: !!window.hotkeyManager,
    hotkeyUIManager: !!window.hotkeyUIManager,
    hotkeyDialogManager: !!window.hotkeyDialogManager,
    HotkeyManager: !!window.HotkeyManager,
    HotkeyUIManager: !!window.HotkeyUIManager,
    HotkeyDialogManager: !!window.HotkeyDialogManager
  };
  
  if (!window.hotkeyManager) {
    console.error('❌ Hotkey Manager not initialized');
    return results;
  }
  
  // Test basic functionality
  console.log('📋 Testing basic functionality...');
  
  try {
    // Test hotkey creation
    const testHotkey = window.hotkeyManager.createHotkey({
      name: 'Test Hotkey',
      description: 'System test hotkey'
    });
    
    results.functionality.hotkeyCreation = !!testHotkey;
    
    // Test trigger addition
    const testTrigger = {
      type: 'keyboard',
      data: {
        key: 'F13',
        code: 'F13',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        description: 'F13 (Test)'
      }
    };
    
    const triggerAdded = window.hotkeyManager.addTriggerToHotkey(testHotkey.id, testTrigger);
    results.functionality.triggerAddition = triggerAdded;
    
    // Test action addition
    const testAction = {
      type: 'obs_recording_toggle',
      data: {}
    };
    
    const actionAdded = window.hotkeyManager.addActionToHotkey(testHotkey.id, testAction);
    results.functionality.actionAddition = actionAdded;
    
    // Test hotkey execution
    const executed = window.hotkeyManager.executeHotkey(testHotkey.id);
    results.functionality.hotkeyExecution = executed;
    
    // Test deck creation
    const testDeck = window.hotkeyManager.createDeck({
      name: 'Test Deck',
      description: 'System test deck',
      rows: 2,
      columns: 2
    });
    
    results.functionality.deckCreation = !!testDeck;
    
    // Test deck switching
    const deckSwitched = window.hotkeyManager.switchToDeck(testDeck.id);
    results.functionality.deckSwitching = deckSwitched;
    
    // Test stats
    const stats = window.hotkeyManager.getStats();
    results.functionality.stats = stats;
    
    // Test configuration export
    const config = window.hotkeyManager.exportConfiguration();
    results.functionality.configExport = !!config && !!config.hotkeys && !!config.decks;
    
    // Cleanup test data
    window.hotkeyManager.deleteHotkey(testHotkey.id);
    window.hotkeyManager.deleteDeck(testDeck.id);
    
    console.log('✅ All tests passed!');
    
    // Create demo hotkeys for user
    createDemoHotkeys();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    results.error = error.message;
  }
  
  console.log('📊 Test Results:', results);
  return results;
};

function createDemoHotkeys() {
  if (!window.hotkeyManager) return;
  
  console.log('🎯 Creating demo hotkeys...');
  
  // Demo 1: Simple Recording Toggle
  const recordingHotkey = window.hotkeyManager.createHotkey({
    name: '🔴 Recording Toggle',
    description: 'Ein-Klick Aufnahme starten/stoppen'
  });
  
  window.hotkeyManager.addActionToHotkey(recordingHotkey.id, {
    type: 'obs_recording_toggle',
    data: {}
  });
  
  // Demo 2: Multi-Action Stream Start
  const streamStartHotkey = window.hotkeyManager.createHotkey({
    name: '📺 Stream Start Sequenz',
    description: 'Automatische Stream-Start-Sequenz mit Verzögerungen'
  });
  
  // Add multiple actions
  window.hotkeyManager.addActionToHotkey(streamStartHotkey.id, {
    type: 'delay',
    data: { duration: 1000 }
  });
  
  window.hotkeyManager.addActionToHotkey(streamStartHotkey.id, {
    type: 'obs_streaming_toggle',
    data: {}
  });
  
  window.hotkeyManager.addActionToHotkey(streamStartHotkey.id, {
    type: 'delay',
    data: { duration: 2000 }
  });
  
  // Demo 3: Create a demo deck
  const demoDeck = window.hotkeyManager.createDeck({
    name: '🎛️ Demo Stream Deck',
    description: 'Beispiel-Layout für Streaming',
    rows: 3,
    columns: 3
  });
  
  // Add hotkey to deck
  const deckHotkey = window.hotkeyManager.createHotkey({
    name: 'Deck Demo',
    description: 'Hotkey in Demo-Deck',
    deckId: demoDeck.id,
    position: { row: 0, col: 0 }
  });
  
  window.hotkeyManager.addActionToHotkey(deckHotkey.id, {
    type: 'obs_recording_toggle',
    data: {}
  });
  
  // Show success message
  if (window.uiManager && window.uiManager.showSuccessMessage) {
    window.uiManager.showSuccessMessage('🎉 Demo-Hotkeys erstellt! Schauen Sie in der Hotkey-Sektion nach.');
  }
  
  console.log('✨ Demo hotkeys created successfully!');
}

// Quick test function for console
window.quickHotkeyTest = function() {
  const results = testHotkeySystem();
  
  if (results.error) {
    console.error('🚨 Test failed:', results.error);
    return false;
  }
  
  const passed = Object.values(results.functionality).every(test => test === true);
  
  if (passed) {
    console.log('🎉 All systems working perfectly!');
    console.log('💡 Try these commands:');
    console.log('  - window.hotkeyManager.getStats() // Show statistics');
    console.log('  - window.hotkeyUIManager.startQuickLearning() // Quick setup');
    console.log('  - window.hotkeyDialogManager.showCreateDeckDialog() // Create deck');
    return true;
  } else {
    console.error('⚠️ Some tests failed');
    return false;
  }
};

// Auto-test on system load
setTimeout(() => {
  if (window.hotkeyManager && window.hotkeyUIManager && window.hotkeyDialogManager) {
    console.log('🎹 Enhanced Hotkey System loaded successfully!');
    console.log('💡 Run quickHotkeyTest() to test all features');
    console.log('📚 See HOTKEY-SYSTEM-README.md for documentation');
  }
}, 3000);

console.log('🧪 Hotkey Test Utility loaded');