const DEFAULT_SETTINGS = {
  aiProvider: 'openai',
  systemMessage: "You are a helpful assistant that summarizes content clearly and concisely.",
  userPrompt: "Please analyze and summarize the following content from {{url}} in {{selected_language}}:\n\n{{content}}",
  model: "gpt-3.5-turbo",
  maxTokens: 150,
  language: "English",
  adjustWebpage: true
};

const PROVIDER_CONFIGS = {
  openai: {
    settingsId: 'openaiSettings',
    defaultModel: 'gpt-3.5-turbo',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions'
  }
  // Add other providers here in the future
};

document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.sync.get(
    ['aiProvider', 'apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language', 'adjustWebpage'], 
    function(data) {
      const provider = data.aiProvider || DEFAULT_SETTINGS.aiProvider;
      document.getElementById('aiProvider').value = provider;
      
      if (data.apiKey) {
        document.getElementById('apiKey').value = data.apiKey;
      }
      document.getElementById('systemMessage').value = data.systemMessage || DEFAULT_SETTINGS.systemMessage;
      document.getElementById('userPrompt').value = data.userPrompt || DEFAULT_SETTINGS.userPrompt;
      document.getElementById('model').value = data.model || DEFAULT_SETTINGS.model;
      document.getElementById('maxTokens').value = data.maxTokens || DEFAULT_SETTINGS.maxTokens;
      document.getElementById('language').value = data.language || DEFAULT_SETTINGS.language;
      document.getElementById('adjustWebpage').checked = data.adjustWebpage ?? DEFAULT_SETTINGS.adjustWebpage;

      updateProviderSettings(provider);
    }
  );

  // Handle AI provider change
  document.getElementById('aiProvider').addEventListener('change', function(e) {
    updateProviderSettings(e.target.value);
  });

  // Save settings
  document.getElementById('save').addEventListener('click', function() {
    const settings = {
      aiProvider: document.getElementById('aiProvider').value,
      apiKey: document.getElementById('apiKey').value,
      systemMessage: document.getElementById('systemMessage').value,
      userPrompt: document.getElementById('userPrompt').value,
      model: document.getElementById('model').value,
      maxTokens: parseInt(document.getElementById('maxTokens').value),
      language: document.getElementById('language').value,
      adjustWebpage: document.getElementById('adjustWebpage').checked
    };

    chrome.storage.sync.set(settings, function() {
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
    });
  });
});

function updateProviderSettings(provider) {
  // Hide all provider settings
  Object.values(PROVIDER_CONFIGS).forEach(config => {
    const element = document.getElementById(config.settingsId);
    if (element) {
      element.classList.add('hidden');
    }
  });

  // Show selected provider settings
  const selectedConfig = PROVIDER_CONFIGS[provider];
  if (selectedConfig) {
    const element = document.getElementById(selectedConfig.settingsId);
    if (element) {
      element.classList.remove('hidden');
    }
  }
} 