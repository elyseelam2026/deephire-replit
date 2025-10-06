// Popup script for extension settings
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const apiUrlInput = document.getElementById('api-url');
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  const config = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
  if (config.apiUrl) {
    apiUrlInput.value = config.apiUrl;
  }
  if (config.apiKey) {
    apiKeyInput.value = config.apiKey;
  }

  // Show status message
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (isError ? 'error' : 'success');
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const apiUrl = apiUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
    const apiKey = apiKeyInput.value.trim();

    if (!apiUrl || !apiKey) {
      showStatus('Please fill in all fields', true);
      return;
    }

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch (error) {
      showStatus('Invalid API URL format', true);
      return;
    }

    // Save to chrome storage
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      await chrome.storage.sync.set({ apiUrl, apiKey });
      showStatus('✅ Settings saved successfully!');
      saveBtn.textContent = 'Save Settings';
      saveBtn.disabled = false;
    } catch (error) {
      showStatus('Failed to save settings: ' + error.message, true);
      saveBtn.textContent = 'Save Settings';
      saveBtn.disabled = false;
    }
  });
});
