// Service worker initialization
self.addEventListener('install', (event) => {
  console.log('🔧 Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service worker activated');
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Initialize context menu after service worker is activated
      (async () => {
        await chrome.contextMenus.removeAll();
        chrome.contextMenus.create({
          id: "summarize-selection",
          title: "Summarize selection",
          contexts: ["selection"]
        });
      })()
    ])
  );
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-selection") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const event = new CustomEvent('create-clariview-popup', {
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
      if (!document.getElementById('clariview-popup')) {
        const event = new CustomEvent('create-clariview-popup');
        document.dispatchEvent(event);
      }
    }
  });
});

// Handle YouTube transcript requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_YOUTUBE_TRANSCRIPT') {
    console.log('[Clariview] Received transcript request for:', request.url);
    
    // Extract video ID from URL
    const videoId = new URL(request.url).searchParams.get('v');
    if (!videoId) {
      sendResponse({ error: 'Invalid YouTube URL' });
      return true;
    }

    (async () => {
      try {
        // Get the video page to extract caption data
        const videoPageResponse = await fetch("https://www.youtube.com/watch?v=" + videoId);
        const videoPageHtml = await videoPageResponse.text();
        
        // Extract captions data
        const splittedHtml = videoPageHtml.split('"captions":');
        if (splittedHtml.length < 2) {
          sendResponse({ error: 'No captions available for this video' });
          return;
        }

        // Parse captions JSON
        const captionsJson = JSON.parse(splittedHtml[1].split(',"videoDetails')[0].replace('\n', ''));
        const captionTracks = captionsJson.playerCaptionsTracklistRenderer.captionTracks;
        
        if (!captionTracks || captionTracks.length === 0) {
          sendResponse({ error: 'No captions available for this video' });
          return;
        }

        // Find English captions or use the first available
        let captionTrack = captionTracks.find(track => 
          track.name.simpleText.toLowerCase().includes('english')
        ) || captionTracks[0];

        // Get the transcript
        const transcriptResponse = await fetch(captionTrack.baseUrl);
        const transcriptText = await transcriptResponse.text();
        
        // Parse the XML transcript using regex instead of DOMParser
        const textSegments = transcriptText.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
        const transcript = textSegments
          .map(segment => {
            // Extract the text content between <text> tags and decode HTML entities
            const text = segment
              .replace(/<[^>]*>/g, '') // Remove XML tags
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();
            return text;
          })
          .join(' ');

        console.log('[Clariview] Successfully fetched transcript, length:', transcript.length);
        sendResponse({ transcript });
      } catch (error) {
        console.error('[Clariview] Error fetching transcript:', error);
        sendResponse({ error: error.message });
      }
    })();

    return true; // Will respond asynchronously
  }
  
  if (request.type === 'FETCH_YOUTUBE_DATA') {
    fetch(request.url, request.options)
      .then(response => response.text())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
}); 