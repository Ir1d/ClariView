function createPopup() {
  if (document.getElementById('llm-helper-popup')) {
    return;
  }

  const popup = document.createElement('div');
  popup.id = 'llm-helper-popup';
  popup.innerHTML = `
    <div class="titlebar">
      <span>LLM Helper</span>
      <select id="displayMode">
        <option value="popup">Popup</option>
        <option value="sidebar">Sidebar</option>
      </select>
    </div>
    <button id="summarize">Summarize Page</button>
    <div id="summary"></div>
    <div class="resize-handle"></div>
  `;

  // Set initial position
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.right = '20px';
  popup.style.width = '300px';
  
  document.body.appendChild(popup);

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
          content: document.body.innerText.substring(0, 4000),
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
document.addEventListener('create-llm-popup', createPopup); 