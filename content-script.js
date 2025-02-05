// Function to check if we're on a YouTube video page
function isYouTubeVideoPage() {
  return window.location.hostname === 'www.youtube.com' && 
         window.location.pathname === '/watch';
}

// Function to wait for the menu container
function waitForMenu() {
  return new Promise((resolve) => {
    const checkMenu = () => {
      const menuContainer = document.querySelector('#top-level-buttons-computed');
      if (menuContainer) {
        resolve(menuContainer);
      } else {
        setTimeout(checkMenu, 100);
      }
    };
    checkMenu();
  });
}

// Function to insert the summary button
async function insertSummaryButton() {
  try {
    const menuContainer = await waitForMenu();
    
    // Clean up any existing buttons
    const existingButtons = document.querySelectorAll('.clariview-summary-btn');
    existingButtons.forEach(btn => btn.remove());

    // Check if button already exists
    if (menuContainer.querySelector('.clariview-summary-btn')) {
      return;
    }

    // Create button element
    const button = document.createElement('button');
    button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m clariview-summary-btn';
    button.setAttribute('aria-label', 'Summarize video with AI');
    button.innerHTML = `<span>Summarize!</span>`;

    // Add custom styles
    if (!document.getElementById('clariview-button-style')) {
      const style = document.createElement('style');
      style.id = 'clariview-button-style';
      style.textContent = `
        .clariview-summary-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background-color: #3B82F6 !important; /* Light blue color */
          color: #FFFFFF !important;
          border: none !important;
          border-radius: 18px !important;
          padding: 0 16px !important;
          height: 36px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          margin: 0 4px !important;
          transition: opacity 0.2s ease !important;
          min-width: 100px !important;
        }
        .clariview-summary-btn:hover {
          opacity: 0.85 !important;
          background-color: #2563EB !important; /* Slightly darker on hover */
        }
        .clariview-summary-btn.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .loading-spinner {
          width: 20px !important;
          height: 20px !important;
          border: 2px solid #ffffff !important;
          border-radius: 50% !important;
          border-top-color: transparent !important;
          animation: spin 1s linear infinite !important;
          margin-right: 8px !important;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add click handler
    button.addEventListener('click', async () => {
      if (button.classList.contains('loading')) return;
      
      button.classList.add('loading');
      const originalContent = button.innerHTML;
      button.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Loading...</span>
      `;

      try {
        console.log('[Clariview] Sending transcript request for URL:', window.location.href);
        
        // Send message to background script to get transcript
        const response = await chrome.runtime.sendMessage({
          type: 'GET_YOUTUBE_TRANSCRIPT',
          url: window.location.href
        });

        console.log('[Clariview] Received response from background script:', response);

        if (!response) {
          throw new Error('No response received from background script');
        }

        if (response.error) {
          throw new Error(response.error);
        }

        if (response.transcript) {
          console.log('[Clariview] Successfully received transcript, length:', response.transcript.length);
          const event = new CustomEvent('create-clariview-popup', {
            detail: { selectedText: response.transcript }
          });
          document.dispatchEvent(event);
        } else {
          throw new Error('No transcript available for this video');
        }
      } catch (error) {
        console.error('[Clariview] Transcript fetch error:', {
          error,
          errorMessage: error.message,
          errorStack: error.stack,
          url: window.location.href
        });
        alert(`Failed to get transcript: ${error.message}`);
      } finally {
        button.classList.remove('loading');
        button.innerHTML = originalContent;
      }
    });

    // Insert the button after the like/dislike buttons
    const likeDislikeButton = menuContainer.querySelector('segmented-like-dislike-button-view-model');
    if (likeDislikeButton) {
      likeDislikeButton.insertAdjacentElement('afterend', button);
      console.log('[Clariview] Button inserted after like/dislike buttons', {
        buttonElement: button,
        insertedAfter: likeDislikeButton,
        location: 'afterend'
      });
    } else {
      menuContainer.insertBefore(button, menuContainer.firstChild);
      console.log('[Clariview] Button inserted at start of menu', {
        buttonElement: button,
        menuContainer,
        location: 'start'
      });
    }

    console.log('[Clariview] Summary button insertion complete', {
      url: window.location.href,
      menuContainer,
      buttonExists: !!document.querySelector('.clariview-summary-btn'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Clariview] Error inserting summary button:', {
      error,
      url: window.location.href,
      menuExists: !!document.querySelector('#top-level-buttons-computed'),
      timestamp: new Date().toISOString()
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  if (isYouTubeVideoPage()) {
    insertSummaryButton();
    setupYouTubeNavigation();
  }
}

// Handle YouTube's SPA navigation
function setupYouTubeNavigation() {
  let lastUrl = window.location.href;
  
  // Create a MutationObserver to watch for URL changes
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isYouTubeVideoPage()) {
        insertSummaryButton();
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Also watch for future navigation events
window.addEventListener('yt-navigate-finish', () => {
  if (isYouTubeVideoPage()) {
    insertSummaryButton();
  }
});

async function loadStyles() {
  const styleId = 'clariview-styles';
  
  // Don't reload if already loaded
  if (document.getElementById(styleId)) {
    return;
  }

  try {
    // First try to use the content_scripts CSS which should be auto-injected
    const existingStyles = document.querySelector('link[href*="content-styles.css"]');
    if (existingStyles) {
      return;
    }

    // Fallback: manually load the CSS
    const url = chrome.runtime.getURL('content-styles.css');
    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = url;
    
    // Add load event listener
    link.addEventListener('load', () => {
      console.log('[Clariview] Styles loaded successfully');
    });
    
    // Add error event listener
    link.addEventListener('error', (error) => {
      console.error('[Clariview] Failed to load styles:', error);
      // Fallback to inline styles if needed
      applyFallbackStyles();
    });

    document.head.appendChild(link);
  } catch (error) {
    console.error('[Clariview] Error in loadStyles:', error);
    // Fallback to inline styles if needed
    applyFallbackStyles();
  }
}

function applyFallbackStyles() {
  const styleId = 'clariview-fallback-styles';
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Essential fallback styles */
    .clariview-summary-btn {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background-color: #3B82F6 !important;
      color: #FFFFFF !important;
      border: none !important;
      border-radius: 18px !important;
      padding: 0 16px !important;
      height: 36px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      margin: 0 4px !important;
      transition: opacity 0.2s ease !important;
      min-width: 100px !important;
    }
    .clariview-summary-btn:hover {
      opacity: 0.85 !important;
      background-color: #2563EB !important;
    }
  `;
  document.head.appendChild(style);
}

async function createPopup(selectedText = null) {
  // Remove existing popup or sidebar if any
  const existingPopup = document.getElementById('clariview-popup');
  const existingSidebar = document.getElementById('clariview-sidebar');
  if (existingPopup) existingPopup.remove();
  if (existingSidebar) existingSidebar.remove();

  // Load styles
  await loadStyles();

  const popup = document.createElement('div');
  popup.id = 'clariview-popup';
  popup.innerHTML = `
    <div class="titlebar">
      <span>ClariView</span>
      <div class="actions">
        <button class="icon-button" id="retry" title="Retry">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path>
          </svg>
        </button>
        <button class="icon-button" id="copy" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"></path>
          </svg>
        </button>
        <select id="displayMode">
          <option value="popup">Popup</option>
          <option value="sidebar">Sidebar</option>
        </select>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="summary">Summary</button>
      <button class="tab" data-tab="chat">Chat</button>
    </div>
    <div class="tab-content active" id="summary-tab">
      <button id="summarize" class="primary-button">Summarize</button>
      <div id="summary"></div>
    </div>
    <div class="tab-content" id="chat-tab">
      <div class="chat-messages"></div>
      <div class="chat-input">
        <div class="chat-input-container">
          <textarea id="chat-input" placeholder="Ask a question..." rows="1"></textarea>
          <button id="send-chat">Send</button>
        </div>
      </div>
    </div>
    <div class="resize-handle"></div>`;

  // Add custom styles
  if (!document.getElementById('clariview-popup-style')) {
    const style = document.createElement('style');
    style.id = 'clariview-popup-style';
    style.textContent = `
      #clariview-popup {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 700px;
        min-height: 400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 16px;
        line-height: 1.5;
      }
      #clariview-popup .titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        cursor: grab;
        user-select: none;
      }
      #clariview-popup .titlebar span {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      #clariview-popup .actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      #clariview-popup .icon-button {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        width: 36px;
        height: 36px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 6px;
        color: #6b7280;
        transition: all 0.2s ease;
        margin: 0;
      }
      #clariview-popup .icon-button:hover {
        background: #f3f4f6;
        color: #111827;
      }
      #clariview-popup .icon-button svg {
        width: 20px;
        height: 20px;
        display: block;
        margin: 0;
      }
      #clariview-popup select {
        padding: 8px 12px;
        height: 36px;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        font-size: 14px;
        cursor: pointer;
        background-color: white;
      }
      #clariview-popup .tabs {
        display: flex;
        padding: 0 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      #clariview-popup .tab {
        padding: 12px 16px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 16px;
        color: #6b7280;
        border-bottom: 2px solid transparent;
      }
      #clariview-popup .tab.active {
        color: #3B82F6;
        border-bottom-color: #3B82F6;
        font-weight: 500;
      }
      #clariview-popup .tab-content {
        display: none;
        padding: 16px;
        font-size: 16px;
      }
      #clariview-popup .tab-content.active {
        display: block;
      }
      #clariview-popup #summary {
        margin-top: 16px;
        white-space: pre-wrap;
        font-size: 16px;
        line-height: 1.6;
      }
      #clariview-popup .chat-messages {
        height: 300px;
        overflow-y: auto;
        padding: 16px;
        font-size: 16px;
      }
      #clariview-popup .chat-input {
        padding: 16px;
        border-top: 1px solid #e5e7eb;
      }
      #clariview-popup .chat-input-container {
        display: flex;
        gap: 8px;
        width: 100%;
        align-items: flex-start;
      }
      #clariview-popup .chat-input textarea {
        width: 70%;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        font-size: 16px;
        resize: none;
        min-height: 40px;
        max-height: 200px;
        overflow-y: auto;
        line-height: 1.5;
        font-family: inherit;
      }
      #clariview-popup .chat-input textarea:focus {
        outline: none;
        border-color: #3B82F6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      #clariview-popup .chat-input button {
        width: 30%;
        padding: 8px 16px;
        background: #3B82F6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        white-space: nowrap;
        align-self: flex-start;
      }
      #clariview-popup .chat-input button:hover {
        background: #2563EB;
      }
      #clariview-popup .primary-button {
        width: 100%;
        padding: 12px;
        background: #3B82F6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
      }
      #clariview-popup .primary-button:hover {
        background: #2563EB;
      }
    `;
    document.head.appendChild(style);
  }

  // Set initial position
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.right = '20px';
  popup.style.width = '700px';
  
  document.body.appendChild(popup);

  // Handle display mode changes
  const displayModeSelect = popup.querySelector('#displayMode');
  displayModeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'sidebar') {
      const selectedText = popup.querySelector('#summary').dataset.selectedText;
      createSidebar(selectedText);
      popup.remove();
    }
  });

  // Dragging functionality
  const titlebar = popup.querySelector('.titlebar');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  function handleDragStart(e) {
    if (e.target.tagName === 'SELECT') return;
    
    isDragging = true;
    popup.style.transition = 'none'; // Disable transitions while dragging
    
    // Get the current position of the popup
    const rect = popup.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
    
    titlebar.style.cursor = 'grabbing';
    e.preventDefault(); // Prevent text selection
    e.stopPropagation(); // Prevent event from reaching webpage
  }

  function handleDrag(e) {
    if (!isDragging) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent event from reaching webpage
    
    // Calculate new position
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // Keep within viewport bounds
    const maxX = window.innerWidth - popup.offsetWidth;
    const maxY = window.innerHeight - popup.offsetHeight;
    
    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    // Apply new position
    popup.style.left = `${currentX}px`;
    popup.style.top = `${currentY}px`;
    popup.style.right = 'auto'; // Remove right positioning
  }

  function handleDragEnd(e) {
    if (!isDragging) return;
    
    isDragging = false;
    titlebar.style.cursor = 'grab';
    popup.style.transition = ''; // Re-enable transitions
    e.stopPropagation(); // Prevent event from reaching webpage
  }

  // Resizing functionality
  const resizeHandle = popup.querySelector('.resize-handle');
  let isResizing = false;
  let startWidth;
  let startHeight;
  let startX;
  let startY;

  function handleResizeStart(e) {
    isResizing = true;
    popup.style.transition = 'none'; // Disable transitions while resizing
    
    startWidth = popup.offsetWidth;
    startHeight = popup.offsetHeight;
    startX = e.clientX;
    startY = e.clientY;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent event from reaching webpage
  }

  function handleResize(e) {
    if (!isResizing) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent event from reaching webpage
    
    // Calculate new dimensions
    const width = startWidth + (e.clientX - startX);
    const height = startHeight + (e.clientY - startY);

    // Apply minimum dimensions
    popup.style.width = `${Math.max(300, width)}px`;
    popup.style.height = `${Math.max(200, height)}px`;
  }

  function handleResizeEnd(e) {
    if (!isResizing) return;
    
    isResizing = false;
    popup.style.transition = ''; // Re-enable transitions
    e.stopPropagation(); // Prevent event from reaching webpage
  }

  // Add event listeners for dragging
  titlebar.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDrag, { capture: true });
  document.addEventListener('mouseup', handleDragEnd, { capture: true });

  // Add event listeners for resizing
  resizeHandle.addEventListener('mousedown', handleResizeStart);
  document.addEventListener('mousemove', handleResize, { capture: true });
  document.addEventListener('mouseup', handleResizeEnd, { capture: true });

  // Handle summarize button click
  const summarizeBtn = popup.querySelector('#summarize');
  summarizeBtn.addEventListener('click', async () => {
    const summaryDiv = popup.querySelector('#summary');
    summaryDiv.textContent = 'Summarizing...';

    // Get settings from storage
    chrome.storage.sync.get(
      ['aiProvider', 'apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language'],
      async function(settings) {
        if (!settings.apiKey) {
          summaryDiv.textContent = 'Please set your API key in the options page.';
          return;
        }

        let content;
        // Check for user selection first
        if (summaryDiv.dataset.selectedText) {
          console.log('[Clariview] Using user-selected text');
          content = summaryDiv.dataset.selectedText;
        }
        // If no selection and on YouTube, try transcript
        else if (isYouTubeVideoPage()) {
          try {
            console.log('[Clariview] Attempting to fetch YouTube transcript');
            const response = await chrome.runtime.sendMessage({
              type: 'GET_YOUTUBE_TRANSCRIPT',
              url: window.location.href
            });

            if (response && response.transcript) {
              console.log('[Clariview] Successfully got YouTube transcript');
              content = response.transcript;
            } else {
              console.log('[Clariview] No transcript available, falling back to page content');
              content = document.body.innerText.substring(0, 4000);
            }
          } catch (error) {
            console.log('[Clariview] Error fetching transcript, falling back to page content:', error);
            content = document.body.innerText.substring(0, 4000);
          }
        } else {
          // Not YouTube or no transcript available
          content = document.body.innerText.substring(0, 4000);
        }

        const pageContent = {
          content,
          title: document.title,
          url: window.location.href
        };

        const processedPrompt = settings.userPrompt
          .replace('{{content}}', pageContent.content)
          .replace('{{url}}', pageContent.url)
          .replace('{{title}}', pageContent.title)
          .replace('{{selected_language}}', settings.language);

        try {
          const messages = [
            {
              role: "system",
              content: settings.systemMessage
            },
            {
              role: "user",
              content: processedPrompt
            }
          ];

          const content = await callLLMApi(settings, messages);
          
          // Store the raw markdown
          summaryDiv.dataset.markdown = content;
          // Render markdown content
          summaryDiv.innerHTML = marked.parse(content, {
            gfm: true,
            breaks: true,
            sanitize: true
          });
        } catch (error) {
          summaryDiv.textContent = `Error: ${error.message}`;
        }
      }
    );
  });

  // Add button handlers
  const retryButton = popup.querySelector('#retry');
  const copyButton = popup.querySelector('#copy');
  const summaryDiv = popup.querySelector('#summary');

  retryButton.addEventListener('click', async () => {
    if (summaryDiv.textContent && summaryDiv.textContent !== 'Summarizing...') {
      summarizeBtn.click(); // Reuse the existing summarize functionality
    }
  });

  copyButton.addEventListener('click', async () => {
    if (summaryDiv.textContent && summaryDiv.textContent !== 'Summarizing...') {
      try {
        const textToCopy = summaryDiv.dataset.markdown || summaryDiv.textContent;
        await navigator.clipboard.writeText(textToCopy);
        // Optional: Show a brief success message
        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>';
        setTimeout(() => {
          copyButton.innerHTML = originalHTML;
        }, 1000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  });

  // Store the selected text for mode switching
  summaryDiv.dataset.selectedText = selectedText || '';

  // Handle tab switching
  const tabs = popup.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active content
      const tabContents = popup.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      popup.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');

      // Auto-summarize when opening summary tab
      if (tab.dataset.tab === 'summary') {
        const summaryDiv = popup.querySelector('#summary');
        if (!summaryDiv.textContent) {
          summarizeContent();
        }
      }
    });
  });

  // Handle chat functionality
  const chatInput = popup.querySelector('#chat-input');
  const sendButton = popup.querySelector('#send-chat');
  const chatMessages = popup.querySelector('.chat-messages');

  async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    appendChatMessage('user', message);
    chatInput.value = '';

    chrome.storage.sync.get(
      ['aiProvider', 'apiKey', 'systemMessage', 'model', 'maxTokens', 'customEndpoint', 'customApiKey', 'customModel', 'anthropicKey', 'anthropicModel', 'deepseekKey', 'deepseekModel'],
      async function(settings) {
        try {
          const messages = [
            {
              role: "system",
              content: settings.systemMessage
            },
            {
              role: "user",
              content: message
            }
          ];

          const response = await callLLMApi(settings, messages);
          appendChatMessage('assistant', response);
        } catch (error) {
          appendChatMessage('assistant', `Error: ${error.message}`);
        }
      }
    );
  }

  function appendChatMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
      <div class="message-role">${role === 'user' ? 'You' : 'Assistant'}</div>
      ${marked.parse(content, { gfm: true, breaks: true, sanitize: true })}
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  sendButton.addEventListener('click', sendChatMessage);

  // Add auto-expanding textarea functionality
  const textarea = popup.querySelector('#chat-input');
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  // Update Enter key handling for textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-summarize on creation if needed
  try {
    if (chrome.runtime?.id) { // Check if extension context is still valid
      chrome.storage.sync.get(['autoSummarize'], function(settings) {
        if (chrome.runtime?.lastError) {
          console.error('[Clariview] Storage error:', chrome.runtime.lastError);
          return;
        }
        
        if (selectedText || settings.autoSummarize) {
          summarizeContent();
        }
      });
    } else {
      console.warn('[Clariview] Extension context invalidated');
      cleanup(); // Clean up any existing elements
    }
  } catch (error) {
    console.error('[Clariview] Error in auto-summarize:', error);
    cleanup(); // Clean up any existing elements
  }
}

async function createSidebar(selectedText = null) {
  // First load the sidebar CSS
  const sidebarStyleId = 'clariview-sidebar-styles';
  if (!document.getElementById(sidebarStyleId)) {
    const sidebarCssUrl = chrome.runtime.getURL('sidebar.css');
    const link = document.createElement('link');
    link.id = sidebarStyleId;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = sidebarCssUrl;
    document.head.appendChild(link);
  }

  // Remove existing popup or sidebar if any
  const existingPopup = document.getElementById('clariview-popup');
  const existingSidebar = document.getElementById('clariview-sidebar');
  if (existingPopup) existingPopup.remove();
  if (existingSidebar) existingSidebar.remove();

  // Load styles
  await loadStyles();

  const sidebar = document.createElement('div');
  sidebar.id = 'clariview-sidebar';
  sidebar.innerHTML = `
    <div class="titlebar">
      <span>ClariView</span>
      <div class="actions">
        <button class="icon-button" id="retry" title="Retry">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path>
          </svg>
        </button>
        <button class="icon-button" id="copy" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"></path>
          </svg>
        </button>
        <select id="displayMode">
          <option value="sidebar">Sidebar</option>
          <option value="popup">Popup</option>
        </select>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="summary">Summary</button>
      <button class="tab" data-tab="chat">Chat</button>
    </div>
    <div class="tab-content active" id="summary-tab">
      <button id="summarize" class="primary-button">Summarize</button>
      <div id="summary"></div>
    </div>
    <div class="tab-content" id="chat-tab">
      <div class="chat-messages"></div>
      <div class="chat-input">
        <div class="chat-input-container">
          <textarea id="chat-input" placeholder="Ask a question..." rows="1"></textarea>
          <button id="send-chat">Send</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Add margin to webpage
  try {
    if (chrome.runtime?.id) {
      chrome.storage.sync.get(['adjustWebpage'], function(data) {
        if (chrome.runtime?.lastError) {
          console.error('[Clariview] Storage error:', chrome.runtime.lastError);
          return;
        }
        if (data.adjustWebpage ?? true) { // Default to true if not set
          document.body.classList.add('with-sidebar');
        }
      });
    }
  } catch (error) {
    console.error('[Clariview] Error adjusting webpage:', error);
  }

  // Create toggle button
  const toggle = document.createElement('button');
  toggle.id = 'clariview-toggle';
  toggle.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="toggle-icon">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  `;
  toggle.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    chrome.storage.sync.get(['adjustWebpage'], function(data) {
      if (data.adjustWebpage ?? true) {
        document.body.classList.toggle('with-sidebar-collapsed');
      }
    });
    toggle.querySelector('.toggle-icon').style.transform = isCollapsed ? 'rotate(180deg)' : '';
  });
  document.body.appendChild(toggle);

  // Handle display mode changes
  const displayModeSelect = sidebar.querySelector('#displayMode');
  displayModeSelect.addEventListener('change', (e) => {
    try {
      if (chrome.runtime?.id) {
        if (e.target.value === 'popup') {
          const selectedText = sidebar.querySelector('#summary').dataset.selectedText;
          createPopup(selectedText);
          sidebar.remove();
          toggle.remove();
          document.body.classList.remove('with-sidebar');
          document.body.classList.remove('with-sidebar-collapsed');
        }
      } else {
        console.warn('[Clariview] Extension context invalidated');
        cleanup();
      }
    } catch (error) {
      console.error('[Clariview] Error changing display mode:', error);
      cleanup();
    }
  });

  // Add button handlers
  const retryButton = sidebar.querySelector('#retry');
  const copyButton = sidebar.querySelector('#copy');
  const summaryDiv = sidebar.querySelector('#summary');
  const summarizeBtn = sidebar.querySelector('#summarize');

  retryButton.addEventListener('click', async () => {
    if (summaryDiv.textContent && summaryDiv.textContent !== 'Summarizing...') {
      summarizeBtn.click();
    }
  });

  copyButton.addEventListener('click', async () => {
    if (summaryDiv.textContent && summaryDiv.textContent !== 'Summarizing...') {
      try {
        const textToCopy = summaryDiv.dataset.markdown || summaryDiv.textContent;
        await navigator.clipboard.writeText(textToCopy);
        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>';
        setTimeout(() => {
          copyButton.innerHTML = originalHTML;
        }, 1000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  });

  // Store the selected text for mode switching
  summaryDiv.dataset.selectedText = selectedText || '';

  // Handle tab switching
  const tabs = sidebar.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active content
      const tabContents = sidebar.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      sidebar.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Auto-summarize when opening summary tab
  const summaryTab = sidebar.querySelector('[data-tab="summary"]');
  summaryTab.addEventListener('click', () => {
    if (!summaryDiv.textContent) {
      summarizeContent();
    }
  });

  // Handle chat functionality
  const chatInput = sidebar.querySelector('#chat-input');
  const sendButton = sidebar.querySelector('#send-chat');
  const chatMessages = sidebar.querySelector('.chat-messages');

  async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    appendChatMessage('user', message);
    chatInput.value = '';

    chrome.storage.sync.get(
      ['aiProvider', 'apiKey', 'systemMessage', 'model', 'maxTokens', 'customEndpoint', 'customApiKey', 'customModel', 'anthropicKey', 'anthropicModel', 'deepseekKey', 'deepseekModel'],
      async function(settings) {
        try {
          const messages = [
            {
              role: "system",
              content: settings.systemMessage
            },
            {
              role: "user",
              content: message
            }
          ];

          const response = await callLLMApi(settings, messages);
          appendChatMessage('assistant', response);
        } catch (error) {
          appendChatMessage('assistant', `Error: ${error.message}`);
        }
      }
    );
  }

  function appendChatMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
      <div class="message-role">${role === 'user' ? 'You' : 'Assistant'}</div>
      ${marked.parse(content, { gfm: true, breaks: true, sanitize: true })}
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  sendButton.addEventListener('click', sendChatMessage);

  // Add auto-expanding textarea functionality
  const textarea = sidebar.querySelector('#chat-input');
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  // Update Enter key handling for textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-summarize on creation if needed
  try {
    if (chrome.runtime?.id) { // Check if extension context is still valid
      chrome.storage.sync.get(['autoSummarize'], function(settings) {
        if (chrome.runtime?.lastError) {
          console.error('[Clariview] Storage error:', chrome.runtime.lastError);
          return;
        }
        
        if (selectedText || settings.autoSummarize) {
          summarizeContent();
        }
      });
    } else {
      console.warn('[Clariview] Extension context invalidated');
      cleanup(); // Clean up any existing elements
    }
  } catch (error) {
    console.error('[Clariview] Error in auto-summarize:', error);
    cleanup(); // Clean up any existing elements
  }

  // Handle summarize button click
  summarizeBtn.addEventListener('click', async () => {
    const summaryDiv = sidebar.querySelector('#summary');
    summaryDiv.textContent = 'Summarizing...';

    try {
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }

      // Get settings from storage
      chrome.storage.sync.get(
        ['aiProvider', 'apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language'],
        async function(settings) {
          if (chrome.runtime?.lastError) {
            console.error('[Clariview] Storage error:', chrome.runtime.lastError);
            summaryDiv.textContent = 'Error loading settings: ' + chrome.runtime.lastError.message;
            return;
          }

          if (!settings.apiKey) {
            summaryDiv.textContent = 'Please set your API key in the options page.';
            return;
          }

          let content;
          // Check for user selection first
          if (summaryDiv.dataset.selectedText) {
            console.log('[Clariview] Using user-selected text');
            content = summaryDiv.dataset.selectedText;
          }
          // If no selection and on YouTube, try transcript
          else if (isYouTubeVideoPage()) {
            try {
              console.log('[Clariview] Attempting to fetch YouTube transcript');
              const response = await chrome.runtime.sendMessage({
                type: 'GET_YOUTUBE_TRANSCRIPT',
                url: window.location.href
              });

              if (response && response.transcript) {
                console.log('[Clariview] Successfully got YouTube transcript');
                content = response.transcript;
              } else {
                console.log('[Clariview] No transcript available, falling back to page content');
                content = document.body.innerText.substring(0, 4000);
              }
            } catch (error) {
              console.log('[Clariview] Error fetching transcript, falling back to page content:', error);
              content = document.body.innerText.substring(0, 4000);
            }
          } else {
            // Not YouTube or no transcript available
            content = document.body.innerText.substring(0, 4000);
          }

          const pageContent = {
            content,
            title: document.title,
            url: window.location.href
          };

          const processedPrompt = settings.userPrompt
            .replace('{{content}}', pageContent.content)
            .replace('{{url}}', pageContent.url)
            .replace('{{title}}', pageContent.title)
            .replace('{{selected_language}}', settings.language);

          try {
            const messages = [
              {
                role: "system",
                content: settings.systemMessage
              },
              {
                role: "user",
                content: processedPrompt
              }
            ];

            const content = await callLLMApi(settings, messages);
            
            // Store the raw markdown
            summaryDiv.dataset.markdown = content;
            // Render markdown content
            summaryDiv.innerHTML = marked.parse(content, {
              gfm: true,
              breaks: true,
              sanitize: true
            });
          } catch (error) {
            summaryDiv.textContent = `Error: ${error.message}`;
          }
        }
      );
    } catch (error) {
      console.error('[Clariview] Error in summarize:', error);
      summaryDiv.textContent = 'Error: ' + error.message;
      cleanup();
    }
  });
}

// Clean up function to remove styles when extension is not in use
function cleanup() {
  const styleElement = document.getElementById('clariview-styles');
  if (styleElement) {
    styleElement.remove();
  }
  const popup = document.getElementById('clariview-popup');
  if (popup) {
    popup.remove();
  }
  const sidebar = document.getElementById('clariview-sidebar');
  if (sidebar) {
    sidebar.remove();
  }
  const toggle = document.getElementById('clariview-toggle');
  if (toggle) {
    toggle.remove();
  }
  // Remove any body classes we added
  document.body.classList.remove('with-sidebar', 'with-sidebar-collapsed');
}

// Only listen for the create event
document.addEventListener('create-clariview-popup', async (event) => {
  cleanup(); // Clean up any existing elements first
  const selectedText = event.detail?.selectedText;
  await createPopup(selectedText);
  // Check for auto-summarize setting or selected text
  chrome.storage.sync.get(['autoSummarize'], function(data) {
    if (selectedText || data.autoSummarize) {
      const popup = document.getElementById('clariview-popup');
      if (popup) {
        popup.querySelector('#summarize').click();
      }
    }
  });
});

// Function to make API calls to different LLM providers
async function callLLMApi(settings, messages) {
  switch (settings.aiProvider) {
    case 'openai':
      return await callOpenAI(settings, messages);
    case 'openai-custom':
      return await callCustomOpenAI(settings, messages);
    case 'anthropic':
      return await callAnthropic(settings, messages);
    case 'deepseek':
      return await callDeepSeek(settings, messages);
    default:
      throw new Error('Unsupported AI provider');
  }
}

async function callOpenAI(settings, messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: messages,
      max_tokens: parseInt(settings.maxTokens)
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
}

async function callCustomOpenAI(settings, messages) {
  const response = await fetch(settings.customEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.customApiKey}`
    },
    body: JSON.stringify({
      model: settings.customModel,
      messages: messages,
      max_tokens: parseInt(settings.maxTokens)
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
}

async function callAnthropic(settings, messages) {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.anthropicModel,
      max_tokens: parseInt(settings.maxTokens),
      messages: [
        {
          role: 'user',
          content: `${systemMessage}\n\n${userMessage}`
        }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.content[0].text;
}

async function callDeepSeek(settings, messages) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.deepseekKey}`
    },
    body: JSON.stringify({
      model: settings.deepseekModel,
      messages: messages,
      max_tokens: parseInt(settings.maxTokens)
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
}

// Update the summarize function to use the new API call function
async function summarizeContent() {
  const summaryDiv = document.querySelector('#summary');
  summaryDiv.textContent = 'Summarizing...';

  // Get settings from storage
  chrome.storage.sync.get(
    [
      'aiProvider', 'apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 
      'language', 'customEndpoint', 'customApiKey', 'customModel', 'anthropicKey', 
      'anthropicModel', 'deepseekKey', 'deepseekModel'
    ],
    async function(settings) {
      // Check for required API key based on provider
      let apiKey;
      switch (settings.aiProvider) {
        case 'openai':
          apiKey = settings.apiKey;
          break;
        case 'openai-custom':
          apiKey = settings.customApiKey;
          break;
        case 'anthropic':
          apiKey = settings.anthropicKey;
          break;
        case 'deepseek':
          apiKey = settings.deepseekKey;
          break;
      }

      if (!apiKey) {
        summaryDiv.textContent = 'Please set your API key in the options page.';
        return;
      }

      let content;
      // Check for user selection first
      if (summaryDiv.dataset.selectedText) {
        console.log('[Clariview] Using user-selected text');
        content = summaryDiv.dataset.selectedText;
      }
      // If no selection and on YouTube, try transcript
      else if (isYouTubeVideoPage()) {
        try {
          console.log('[Clariview] Attempting to fetch YouTube transcript');
          const response = await chrome.runtime.sendMessage({
            type: 'GET_YOUTUBE_TRANSCRIPT',
            url: window.location.href
          });

          if (response && response.transcript) {
            console.log('[Clariview] Successfully got YouTube transcript');
            content = response.transcript;
          } else {
            console.log('[Clariview] No transcript available, falling back to page content');
            content = document.body.innerText.substring(0, 4000);
          }
        } catch (error) {
          console.log('[Clariview] Error fetching transcript, falling back to page content:', error);
          content = document.body.innerText.substring(0, 4000);
        }
      } else {
        // Not YouTube or no transcript available
        content = document.body.innerText.substring(0, 4000);
      }

      const pageContent = {
        content,
        title: document.title,
        url: window.location.href
      };

      const processedPrompt = settings.userPrompt
        .replace('{{content}}', pageContent.content)
        .replace('{{url}}', pageContent.url)
        .replace('{{title}}', pageContent.title)
        .replace('{{selected_language}}', settings.language);

      try {
        const messages = [
          {
            role: "system",
            content: settings.systemMessage
          },
          {
            role: "user",
            content: processedPrompt
          }
        ];

        const content = await callLLMApi(settings, messages);
        
        // Store the raw markdown
        summaryDiv.dataset.markdown = content;
        // Render markdown content
        summaryDiv.innerHTML = marked.parse(content, {
          gfm: true,
          breaks: true,
          sanitize: true
        });
      } catch (error) {
        summaryDiv.textContent = `Error: ${error.message}`;
      }
    }
  );
}

// Update the chat message sending function to use the new API call function
async function sendChatMessage() {
  const chatInput = document.querySelector('#chat-input');
  const message = chatInput.value.trim();
  if (!message) return;

  appendChatMessage('user', message);
  chatInput.value = '';

  chrome.storage.sync.get(
    [
      'aiProvider', 'apiKey', 'systemMessage', 'model', 'maxTokens', 
      'customEndpoint', 'customApiKey', 'customModel', 'anthropicKey', 
      'anthropicModel', 'deepseekKey', 'deepseekModel'
    ],
    async function(settings) {
      try {
        const messages = [
          {
            role: "system",
            content: settings.systemMessage
          },
          {
            role: "user",
            content: message
          }
        ];

        const response = await callLLMApi(settings, messages);
        appendChatMessage('assistant', response);
      } catch (error) {
        appendChatMessage('assistant', `Error: ${error.message}`);
      }
    }
  );
} 