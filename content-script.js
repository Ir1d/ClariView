function createPopup(selectedText = null) {
  // Remove existing popup or sidebar if any
  const existingPopup = document.getElementById('llm-helper-popup');
  const existingSidebar = document.getElementById('llm-helper-sidebar');
  if (existingPopup) existingPopup.remove();
  if (existingSidebar) existingSidebar.remove();

  const popup = document.createElement('div');
  popup.id = 'llm-helper-popup';
  popup.innerHTML = `
    <div class="titlebar">
      <span>LLM Helper</span>
      <div class="actions">
        <button class="icon-button" id="retry" title="Retry">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path>
          </svg>
        </button>
        <button class="icon-button" id="copy" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-4 w-4">
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
        <input type="text" id="chat-input" placeholder="Ask a question about the page...">
        <button id="send-chat">Send</button>
      </div>
    </div>
    <div class="resize-handle"></div>
  `;

  // Set initial position
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.right = '20px';
  popup.style.width = '300px';
  
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
  }

  function handleDrag(e) {
    if (!isDragging) return;

    e.preventDefault();
    
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

  function handleDragEnd() {
    if (!isDragging) return;
    
    isDragging = false;
    titlebar.style.cursor = 'grab';
    popup.style.transition = ''; // Re-enable transitions
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
  }

  function handleResize(e) {
    if (!isResizing) return;

    e.preventDefault();
    
    // Calculate new dimensions
    const width = startWidth + (e.clientX - startX);
    const height = startHeight + (e.clientY - startY);

    // Apply minimum dimensions
    popup.style.width = `${Math.max(300, width)}px`;
    popup.style.height = `${Math.max(200, height)}px`;
  }

  function handleResizeEnd() {
    if (!isResizing) return;
    
    isResizing = false;
    popup.style.transition = ''; // Re-enable transitions
  }

  // Add event listeners for dragging
  titlebar.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', handleDragEnd);

  // Add event listeners for resizing
  resizeHandle.addEventListener('mousedown', handleResizeStart);
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', handleResizeEnd);

  // Handle summarize button click
  const summarizeBtn = popup.querySelector('#summarize');
  summarizeBtn.addEventListener('click', async () => {
    const summaryDiv = popup.querySelector('#summary');
    summaryDiv.textContent = 'Summarizing...';

    // Get settings from storage
    chrome.storage.sync.get(
      ['apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language'],
      async function(settings) {
        if (!settings.apiKey) {
          summaryDiv.textContent = 'Please set your API key in the options page.';
          return;
        }

        const pageContent = {
          content: selectedText || document.body.innerText.substring(0, 4000),
          title: document.title,
          url: window.location.href
        };

        const processedPrompt = settings.userPrompt
          .replace('{{content}}', pageContent.content)
          .replace('{{url}}', pageContent.url)
          .replace('{{title}}', pageContent.title)
          .replace('{{selected_language}}', settings.language);

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
              model: settings.model,
              messages: [
                {
                  role: "system",
                  content: settings.systemMessage
                },
                {
                  role: "user",
                  content: processedPrompt
                }
              ],
              max_tokens: settings.maxTokens
            })
          });

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          // Store the raw markdown
          summaryDiv.dataset.markdown = data.choices[0].message.content;
          // Render markdown content
          summaryDiv.innerHTML = marked.parse(data.choices[0].message.content, {
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
    });
  });

  // Auto-summarize when opening summary tab
  const summaryTab = popup.querySelector('[data-tab="summary"]');
  summaryTab.addEventListener('click', () => {
    const summaryDiv = popup.querySelector('#summary');
    if (!summaryDiv.textContent) {
      summarizeContent();
    }
  });

  // Handle chat functionality
  const chatInput = popup.querySelector('#chat-input');
  const sendButton = popup.querySelector('#send-chat');
  const chatMessages = popup.querySelector('.chat-messages');

  async function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Add user message to chat
    appendChatMessage('user', question);
    chatInput.value = '';

    // Get settings from storage
    chrome.storage.sync.get(
      ['apiKey', 'model', 'maxTokens'],
      async function(settings) {
        if (!settings.apiKey) {
          appendChatMessage('assistant', 'Please set your API key in the options page.');
          return;
        }

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
              model: settings.model,
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant answering questions about the webpage content. Base your answers only on the provided context."
                },
                {
                  role: "user",
                  content: `Context: ${selectedText || document.body.innerText.substring(0, 4000)}\n\nQuestion: ${question}`
                }
              ],
              max_tokens: settings.maxTokens
            })
          });

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          appendChatMessage('assistant', data.choices[0].message.content);
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
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-summarize on creation if needed
  chrome.storage.sync.get(['autoSummarize'], function(settings) {
    if (selectedText || settings.autoSummarize) {
      summarizeContent();
    }
  });
}

function createSidebar(selectedText = null) {
  const sidebar = document.createElement('div');
  sidebar.id = 'llm-helper-sidebar';
  sidebar.innerHTML = `
    <div class="titlebar">
      <span>LLM Helper</span>
      <div class="actions">
        <button class="icon-button" id="retry" title="Retry">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-4 w-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"></path>
          </svg>
        </button>
        <button class="icon-button" id="copy" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" class="h-4 w-4">
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
        <input type="text" id="chat-input" placeholder="Ask a question about the page...">
        <button id="send-chat">Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Add margin to webpage
  chrome.storage.sync.get(['adjustWebpage'], function(data) {
    if (data.adjustWebpage ?? true) { // Default to true if not set
      document.body.classList.add('with-sidebar');
    }
  });

  // Create toggle button
  const toggle = document.createElement('button');
  toggle.id = 'llm-helper-toggle';
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
    if (e.target.value === 'popup') {
      const selectedText = sidebar.querySelector('#summary').dataset.selectedText;
      createPopup(selectedText);
      sidebar.remove();
      toggle.remove();
      document.body.classList.remove('with-sidebar');
      document.body.classList.remove('with-sidebar-collapsed');
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
    const question = chatInput.value.trim();
    if (!question) return;

    // Add user message to chat
    appendChatMessage('user', question);
    chatInput.value = '';

    // Get settings from storage
    chrome.storage.sync.get(
      ['apiKey', 'model', 'maxTokens'],
      async function(settings) {
        if (!settings.apiKey) {
          appendChatMessage('assistant', 'Please set your API key in the options page.');
          return;
        }

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
              model: settings.model,
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant answering questions about the webpage content. Base your answers only on the provided context."
                },
                {
                  role: "user",
                  content: `Context: ${selectedText || document.body.innerText.substring(0, 4000)}\n\nQuestion: ${question}`
                }
              ],
              max_tokens: settings.maxTokens
            })
          });

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          appendChatMessage('assistant', data.choices[0].message.content);
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
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-summarize on creation if needed
  chrome.storage.sync.get(['autoSummarize'], function(settings) {
    if (selectedText || settings.autoSummarize) {
      summarizeContent();
    }
  });

  // Handle summarize button click
  summarizeBtn.addEventListener('click', async () => {
    const summaryDiv = sidebar.querySelector('#summary');
    summaryDiv.textContent = 'Summarizing...';

    // Get settings from storage
    chrome.storage.sync.get(
      ['apiKey', 'systemMessage', 'userPrompt', 'model', 'maxTokens', 'language'],
      async function(settings) {
        if (!settings.apiKey) {
          summaryDiv.textContent = 'Please set your API key in the options page.';
          return;
        }

        const pageContent = {
          content: selectedText || document.body.innerText.substring(0, 4000),
          title: document.title,
          url: window.location.href
        };

        const processedPrompt = settings.userPrompt
          .replace('{{content}}', pageContent.content)
          .replace('{{url}}', pageContent.url)
          .replace('{{title}}', pageContent.title)
          .replace('{{selected_language}}', settings.language);

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
              model: settings.model,
              messages: [
                {
                  role: "system",
                  content: settings.systemMessage
                },
                {
                  role: "user",
                  content: processedPrompt
                }
              ],
              max_tokens: settings.maxTokens
            })
          });

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error.message);
          }
          // Store the raw markdown
          summaryDiv.dataset.markdown = data.choices[0].message.content;
          // Render markdown content
          summaryDiv.innerHTML = marked.parse(data.choices[0].message.content, {
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
}

// Only listen for the create event
document.addEventListener('create-llm-popup', (event) => {
  const selectedText = event.detail?.selectedText;
  createPopup(selectedText);
  // Check for auto-summarize setting or selected text
  chrome.storage.sync.get(['autoSummarize'], function(data) {
    if (selectedText || data.autoSummarize) {
      const popup = document.getElementById('llm-helper-popup');
      if (popup) {
        popup.querySelector('#summarize').click();
      }
    }
  });
}); 