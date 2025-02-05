const DEFAULT_SETTINGS = {
  aiProvider: 'openai',
  systemMessage: "You are a helpful assistant that summarizes content clearly and concisely.",
  userPrompt: "Please analyze and summarize the following content from {{url}} in {{selected_language}}:\n\n{{content}}",
  model: "gpt-4o-mini-2024-07-18",
  maxTokens: 150,
  language: "English",
  adjustWebpage: true,
  autoSummarize: false,
  defaultView: 'popup'
};

const PROVIDER_CONFIGS = {
  openai: {
    settingsId: 'openaiSettings',
    defaultModel: 'gpt-4o-mini-2024-07-18',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions'
  },
  openai_custom: {
    settingsId: 'openaiCustomSettings',
    defaultModel: 'gpt-3.5-turbo',
    apiEndpoint: ''
  },
  anthropic: {
    settingsId: 'anthropicSettings',
    defaultModel: 'claude-3-sonnet-20240229',
    apiEndpoint: ''
  },
  deepseek: {
    settingsId: 'deepseekSettings',
    defaultModel: 'deepseek-chat',
    apiEndpoint: ''
  }
};

// Save options to chrome.storage
function saveOptions() {
  const status = document.getElementById('status');
  chrome.storage.sync.set(
    {
      aiProvider: document.getElementById('aiProvider').value,
      apiKey: document.getElementById('apiKey').value,
      systemMessage: document.getElementById('systemMessage').value,
      userPrompt: document.getElementById('userPrompt').value,
      model: document.getElementById('model').value,
      maxTokens: parseInt(document.getElementById('maxTokens').value, 10),
      language: document.getElementById('language').value,
      adjustWebpage: document.getElementById('adjustWebpage').checked,
      autoSummarize: document.getElementById('autoSummarize').checked,
      customEndpoint: document.getElementById('customEndpoint').value,
      customApiKey: document.getElementById('customApiKey').value,
      customModel: document.getElementById('customModel').value,
      anthropicKey: document.getElementById('anthropicKey').value,
      anthropicModel: document.getElementById('anthropicModel').value,
      deepseekKey: document.getElementById('deepseekKey').value,
      deepseekModel: document.getElementById('deepseekModel').value
    },
    function() {
      status.textContent = 'Options saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 750);
    }
  );
}

// Restore options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(
    {
      aiProvider: 'openai',
      apiKey: '',
      systemMessage: DEFAULT_SETTINGS.systemMessage,
      userPrompt: DEFAULT_SETTINGS.userPrompt,
      model: DEFAULT_SETTINGS.model,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
      language: DEFAULT_SETTINGS.language,
      adjustWebpage: DEFAULT_SETTINGS.adjustWebpage,
      autoSummarize: DEFAULT_SETTINGS.autoSummarize,
      customEndpoint: '',
      customApiKey: '',
      customModel: '',
      anthropicKey: '',
      anthropicModel: 'claude-3-opus-20240229',
      deepseekKey: '',
      deepseekModel: 'deepseek-chat'
    },
    function(items) {
      document.getElementById('aiProvider').value = items.aiProvider;
      document.getElementById('apiKey').value = items.apiKey;
      document.getElementById('systemMessage').value = items.systemMessage;
      document.getElementById('userPrompt').value = items.userPrompt;
      document.getElementById('model').value = items.model;
      document.getElementById('maxTokens').value = items.maxTokens;
      document.getElementById('language').value = items.language;
      document.getElementById('adjustWebpage').checked = items.adjustWebpage;
      document.getElementById('autoSummarize').checked = items.autoSummarize;
      document.getElementById('customEndpoint').value = items.customEndpoint;
      document.getElementById('customApiKey').value = items.customApiKey;
      document.getElementById('customModel').value = items.customModel;
      document.getElementById('anthropicKey').value = items.anthropicKey;
      document.getElementById('anthropicModel').value = items.anthropicModel;
      document.getElementById('deepseekKey').value = items.deepseekKey;
      document.getElementById('deepseekModel').value = items.deepseekModel;
      updateProviderFields();
    }
  );
}

// Show/hide provider-specific settings based on selected provider
function updateProviderSettings(provider) {
  // Hide all provider settings first
  document.querySelectorAll('.provider-settings').forEach(el => {
    el.style.display = 'none';
  });

  // Show selected provider settings
  const selectedSettings = document.getElementById(`${provider}Settings`);
  if (selectedSettings) {
    selectedSettings.style.display = 'block';
  }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('aiProvider').addEventListener('change', (e) => {
  updateProviderSettings(e.target.value);
}); 