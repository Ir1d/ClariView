// Create context menu
chrome.contextMenus.create({
  id: "summarize-selection",
  title: "Summarize selection",
  contexts: ["selection"]
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-selection") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const event = new CustomEvent('create-llm-popup', {
          detail: { selectedText: window.getSelection().toString() }
        });
        document.dispatchEvent(event);
      }
    });
  }
});

// Existing click handler
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