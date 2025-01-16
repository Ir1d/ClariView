document.getElementById('summarize').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Inject the content script if not already injected
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Create and dispatch the event only if popup doesn't exist
      if (!document.getElementById('llm-helper-popup')) {
        const event = new CustomEvent('create-llm-popup');
        document.dispatchEvent(event);
      }
    }
  });
  
  window.close();
}); 