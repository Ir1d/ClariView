document.getElementById('summarize').addEventListener('click', async () => {
  // Get settings from storage
  chrome.storage.sync.get(
    ['apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language'], 
    async function(settings) {
      if (!settings.apiKey) {
        document.getElementById('summary').textContent = 'Please set your API key in the options page.';
        return;
      }

      // Get page content from the parent window
      const pageContent = {
        content: document.body.innerText.substring(0, 4000),
        title: document.title,
        url: window.location.href
      };

      // Process and display summary
      const processedPrompt = settings.userPrompt
        .replace('{{content}}', pageContent.content)
        .replace('{{url}}', pageContent.url)
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
    }
  );
});

// Copy the summarizeContent function from popup.js 