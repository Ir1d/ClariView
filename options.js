const DEFAULT_SETTINGS = {
  aiProvider: 'openai',
  systemMessage: "You are a helpful assistant that summarizes content clearly and concisely.",
  userPrompt: "Please analyze and summarize the following content from {{url}} in {{selected_language}}:\n\n{{content}}",
  model: "gpt-4o-mini-2024-07-18",
  maxTokens: 150,
  language: "English",
  adjustWebpage: true,
  autoSummarize: false
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
  const provider = document.getElementById('aiProvider').value;
  
  // Common settings
  const settings = {
    aiProvider: provider,
    language: document.getElementById('language').value,
    systemMessage: document.getElementById('systemMessage').value,
    userPrompt: document.getElementById('userPrompt').value,
    maxTokens: document.getElementById('maxTokens').value,
    adjustWebpage: document.getElementById('adjustWebpage').checked,
    autoSummarize: document.getElementById('autoSummarize').checked
  };

  // Provider-specific settings
  switch (provider) {
    case 'openai':
      settings.apiKey = document.getElementById('apiKey').value;
      settings.model = document.getElementById('model').value;
      break;
    case 'openai_custom':
      settings.customEndpoint = document.getElementById('customEndpoint').value;
      settings.customApiKey = document.getElementById('customApiKey').value;
      settings.customModel = document.getElementById('customModel').value;
      break;
    case 'anthropic':
      settings.anthropicKey = document.getElementById('anthropicKey').value;
      settings.anthropicModel = document.getElementById('anthropicModel').value;
      break;
    case 'deepseek':
      settings.deepseekKey = document.getElementById('deepseekKey').value;
      settings.deepseekModel = document.getElementById('deepseekModel').value;
      break;
  }

  chrome.storage.sync.set(settings, () => {
    status.textContent = 'Options saved.';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
}

// Restore options from chrome.storage
function restoreOptions() {
  chrome.storage.sync.get({
    // Default values
    aiProvider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    customEndpoint: '',
    customApiKey: '',
    customModel: '',
    anthropicKey: '',
    anthropicModel: 'claude-3-sonnet-20240229',
    deepseekKey: '',
    deepseekModel: 'deepseek-chat',
    language: 'English',
    systemMessage: 'You are a helpful assistant that summarizes web content and answers questions about it.',
    userPrompt: 'Please provide a concise summary of the following content in {{selected_language}}:\n\nTitle: {{title}}\nURL: {{url}}\n\nContent:\n{{content}}',
    maxTokens: 150,
    adjustWebpage: true,
    autoSummarize: false
  }, (items) => {
    // Restore common settings
    document.getElementById('aiProvider').value = items.aiProvider;
    document.getElementById('language').value = items.language;
    document.getElementById('systemMessage').value = items.systemMessage;
    document.getElementById('userPrompt').value = items.userPrompt;
    document.getElementById('maxTokens').value = items.maxTokens;
    document.getElementById('adjustWebpage').checked = items.adjustWebpage;
    document.getElementById('autoSummarize').checked = items.autoSummarize;

    // Restore provider-specific settings
    document.getElementById('apiKey').value = items.apiKey;
    document.getElementById('model').value = items.model;
    document.getElementById('customEndpoint').value = items.customEndpoint;
    document.getElementById('customApiKey').value = items.customApiKey;
    document.getElementById('customModel').value = items.customModel;
    document.getElementById('anthropicKey').value = items.anthropicKey;
    document.getElementById('anthropicModel').value = items.anthropicModel;
    document.getElementById('deepseekKey').value = items.deepseekKey;
    document.getElementById('deepseekModel').value = items.deepseekModel;

    // Show/hide provider settings
    updateProviderSettings(items.aiProvider);
  });
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