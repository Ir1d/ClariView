chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      if (!document.getElementById('llm-helper-popup')) {
        const event = new CustomEvent('create-llm-popup');
        document.dispatchEvent(event);
      }
    }
  });
}); 