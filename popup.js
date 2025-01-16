document.getElementById('summarize').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Get all settings from storage
  chrome.storage.sync.get(
    ['apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language'], 
    async function(settings) {
      if (!settings.apiKey) {
        document.getElementById('summary').textContent = 'Please set your API key in the options page.';
        return;
      }

      // Inject content script to get page content
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getPageContent,
      }, async (results) => {
        const pageContent = results[0].result;
        
        // Replace placeholders in the prompt
        const processedPrompt = settings.userPrompt
          .replace('{{content}}', pageContent.content)
          .replace('{{url}}', tab.url)
          .replace('{{title}}', pageContent.title)
          .replace('{{selected_language}}', settings.language);

        const summary = await summarizeContent(
          processedPrompt,
          settings.apiKey,
          settings.systemMessage,
          settings.model,
          settings.maxTokens
        );
        document.getElementById('summary').textContent = summary;
      });
    }
  );
});

function getPageContent() {
  return {
    content: document.body.innerText.substring(0, 4000),
    title: document.title
  };
}

async function summarizeContent(prompt, apiKey, systemMessage, model, maxTokens) {
  try {
    const providerConfig = PROVIDER_CONFIGS['openai']; // For now, hardcoded to OpenAI
    const response = await fetch(providerConfig.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: maxTokens
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.choices[0].message.content;
  } catch (error) {
    return `Error: ${error.message}`;
  }
} 