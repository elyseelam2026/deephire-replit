// Background service worker for Chrome extension
console.log('[DeepHire] Background service worker initialized');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'IMPORT_PROFILE') {
    handleProfileImport(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

// Handle profile import
async function handleProfileImport(profileData) {
  try {
    // Get API configuration from storage
    const config = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    
    if (!config.apiUrl || !config.apiKey) {
      throw new Error('Please configure API settings in extension popup');
    }

    // Send profile data to DeepHire backend
    const response = await fetch(`${config.apiUrl}/api/extension/import-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DeepHire-API-Key': config.apiKey
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('[DeepHire] Import successful:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('[DeepHire] Import failed:', error);
    return { success: false, error: error.message };
  }
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DeepHire] Extension installed');
    // User can click the extension icon to configure
  }
});
