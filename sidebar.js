async function summarizeContent(prompt, apiKey, systemMessage, model, maxTokens) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: parseInt(maxTokens),
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in summarizeContent:', error);
    return `Error: ${error.message}`;
  }
}

// Initialize sidebar functionality
document.getElementById('summarize').addEventListener('click', async () => {
  const button = document.getElementById('summarize');
  const input = document.getElementById('input');
  const summary = document.getElementById('summary');

  // Disable button and show loading state
  button.disabled = true;
  button.textContent = 'Summarizing...';
  
  try {
    // Get settings from storage
    const settings = await chrome.storage.sync.get([
      'apiKey', 
      'systemMessage', 
      'userPrompt', 
      'model', 
      'maxTokens', 
      'language'
    ]);

    if (!settings.apiKey) {
      summary.textContent = 'Please set your API key in the options page.';
      return;
    }

    // Get input content
    const content = input.value.trim();
    if (!content) {
      summary.textContent = 'Please enter some text to summarize.';
      return;
    }

    // Process the prompt
    const processedPrompt = settings.userPrompt
      .replace('{{content}}', content)
      .replace('{{url}}', window.location.href)
      .replace('{{title}}', document.title)
      .replace('{{selected_language}}', settings.language);

    // Get and display summary
    const summaryText = await summarizeContent(
      processedPrompt,
      settings.apiKey,
      settings.systemMessage,
      settings.model,
      settings.maxTokens
    );

    summary.textContent = summaryText;
  } catch (error) {
    console.error('Error:', error);
    summary.textContent = `Error: ${error.message}`;
  } finally {
    // Reset button state
    button.disabled = false;
    button.textContent = 'Summarize';
  }
}); 