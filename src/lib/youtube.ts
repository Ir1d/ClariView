/// <reference types="chrome"/>

interface TranscriptLanguageOption {
  language: string;
  link: string;
}

// Declare the window interface extension
declare global {
  interface Window {
    clariviewYT: {
      insertSummaryButton: () => void;
      getYouTubeTranscript: (url: string) => Promise<string | null>;
    }
  }
}

async function fetchViaBackground(url: string, options?: RequestInit): Promise<string> {
  console.log('🚀 Sending fetch request to background:', { url, options });
  
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_YOUTUBE_DATA',
    url,
    options
  });
  
  console.log('✉️ Got response from background:', response);

  if (!response.success) {
    console.error('❌ Background fetch failed:', response.error);
    throw new Error(response.error || 'Failed to fetch data');
  }

  console.log('✅ Background fetch succeeded, data length:', response.data.length);
  return response.data;
}

export async function getYouTubeTranscript(url: string): Promise<string | null> {
  console.log('🎬 Starting YouTube transcript fetch for URL:', url);
  
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error('❌ Invalid YouTube URL:', url);
      return null;
    }
    console.log('🎥 Processing YouTube video ID:', videoId);

    // First try to get the transcript data from the new API endpoint
    console.log('🔄 Attempting to fetch transcript using new API method...');
    const transcriptData = await fetchTranscriptData(videoId);
    if (transcriptData) {
      console.log('📝 Successfully fetched transcript, length:', transcriptData.length);
      console.log('📝 Transcript preview:', transcriptData.slice(0, 500) + '...');
      return transcriptData;
    }
    console.log('⚠️ New API method failed, trying fallback method...');

    // Fallback to the old method if the new one fails
    const langOptions = await getLangOptionsWithLink(videoId);
    if (!langOptions || langOptions.length === 0) {
      console.error('❌ No transcripts available for video:', videoId);
      return null;
    }
    console.log('🌐 Available language options:', JSON.stringify(langOptions, null, 2));

    const englishOption = langOptions.find(opt => 
      opt.language.toLowerCase().includes('english')
    );
    const selectedOption = englishOption || langOptions[0];
    console.log('🎯 Selected language option:', JSON.stringify(selectedOption, null, 2));

    console.log('📥 Fetching transcript for selected language...');
    const transcript = await getTranscript(selectedOption);
    console.log('📝 Final transcript length:', transcript.length);
    console.log('📝 Final transcript preview:', transcript.slice(0, 500) + '...');
    return transcript;
  } catch (error) {
    console.error('❌ Error getting YouTube transcript:', error);
    return null;
  }
}

async function fetchTranscriptData(videoId: string): Promise<string | null> {
  try {
    console.log('🔄 Fetching transcript data using new API method...');
    const data = await fetchViaBackground(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, {
      headers: {
        'Accept': '*/*',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20231102'
      }
    });
    console.log('📊 Raw API response received');

    const parsedData = JSON.parse(data);
    const playerResponse = parsedData[2]?.playerResponse;
    if (!playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      console.log('❌ No caption tracks found in API response');
      return null;
    }

    const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    console.log('🎯 Available caption tracks:', captionTracks);

    const englishTrack = captionTracks.find(track => 
      track.name?.simpleText?.toLowerCase().includes('english')
    ) || captionTracks[0];

    if (!englishTrack?.baseUrl) {
      console.log('❌ No valid caption track URL found');
      return null;
    }
    console.log('✅ Selected caption track:', englishTrack);

    return await getTranscript({ 
      language: englishTrack.name.simpleText, 
      link: englishTrack.baseUrl 
    });
  } catch (error) {
    console.error('Error fetching transcript data:', error);
    return null;
  }
}

async function getLangOptionsWithLink(videoId: string): Promise<TranscriptLanguageOption[]> {
  try {
    const videoPageHtml = await fetchViaBackground(`https://www.youtube.com/watch?v=${videoId}`);
    const splittedHtml = videoPageHtml.split('"captions":');
    if (splittedHtml.length < 2) return [];

    const captionsJsonStr = splittedHtml[1].split(',"videoDetails')[0].replace('\n', '');
    const captionsJson = JSON.parse(captionsJsonStr);

    if (!captionsJson?.playerCaptionsTracklistRenderer?.captionTracks) {
      return [];
    }

    return captionsJson.playerCaptionsTracklistRenderer.captionTracks.map(track => ({
      language: track.name.simpleText,
      link: track.baseUrl
    }));
  } catch (error) {
    console.error('Error getting language options:', error);
    return [];
  }
}

async function getTranscript(langOption: TranscriptLanguageOption): Promise<string> {
  try {
    const transcriptXml = await fetchViaBackground(langOption.link);
    const transcriptText = transcriptXml
      .split(/<text[^>]*>([^<]*)<\/text>/g)
      .filter((_, i) => i % 2 === 1) // Get only the text content
      .map(text => text.trim())
      .filter(text => text)
      .join(' ');

    return transcriptText || 'No transcript content found';
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
  }
}

function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

function waitForElm(selector: string): Promise<Element> {
  return new Promise(resolve => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector)!);
    }

    const observer = new MutationObserver(mutations => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector)!);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
}

export function insertSummaryButton() {
  // Clean up any existing buttons
  const existingButtons = document.querySelectorAll('.clariview-summary-btn');
  existingButtons.forEach(btn => btn.remove());

  // Wait for the YouTube menu to load
  waitForElm('#top-level-buttons-computed').then((menuContainer) => {
    // Check if button already exists
    if (menuContainer.querySelector('.clariview-summary-btn')) {
      return;
    }

    // Create button using YouTube's structure
    const buttonHTML = `
      <ytd-button-renderer class="style-scope ytd-menu-renderer clariview-summary-btn" button-renderer="">
        <yt-button-shape>
          <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading" 
                  aria-label="Summarize video with AI">
            <div class="yt-spec-button-shape-next__icon" aria-hidden="true">
              <yt-icon style="width: 24px; height: 24px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" style="width: 24px; height: 24px;">
                  <g fill="none" fill-rule="nonzero" transform="translate(5 5)">
                    <circle cx="59" cy="59" r="59" fill="#10A37F" stroke="#10A37F" stroke-width="9" />
                    <path fill="#E5E7EB"
                      d="M76.397 67.004c-1.545 5.815-5.642 8.127-10.356 9.47-.464.148-.386.595-.386.595l.695 4.623s.077.373.696.298C83.66 80.2 94.714 68.047 92.78 53.285c-2.01-10.215-10.356-14.167-17.93-13.123-7.652 1.193-12.908 8.053-11.67 15.434 1.004 6.561 6.646 11.184 13.215 11.408Z" />
                    <path fill="#FFF"
                      d="M26.16 55.596c1.005 6.487 6.722 11.11 13.211 11.408-1.622 5.815-5.562 8.127-10.352 9.47-.464.148-.387.595-.387.595l.773 4.623s.077.373.695.298c16.534-1.79 27.736-13.943 25.65-28.705-1.93-10.215-10.198-14.167-17.846-13.123C30.254 41.355 25 48.215 26.16 55.596Z" />
                  </g>
                </svg>
              </yt-icon>
            </div>
            <div class="yt-spec-button-shape-next__button-text-content">Summarize!</div>
            <yt-touch-feedback-shape>
              <div class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response" aria-hidden="true">
                <div class="yt-spec-touch-feedback-shape__stroke"></div>
                <div class="yt-spec-touch-feedback-shape__fill"></div>
              </div>
            </yt-touch-feedback-shape>
          </button>
        </yt-button-shape>
      </ytd-button-renderer>
    `;

    // Add custom styles for the button
    if (!document.getElementById('clariview-button-style')) {
      const style = document.createElement('style');
      style.id = 'clariview-button-style';
      style.textContent = `
        .clariview-summary-btn button {
          background-color: var(--yt-spec-brand-button-background) !important;
          color: var(--yt-spec-static-brand-white) !important;
        }
        .clariview-summary-btn .yt-spec-button-shape-next__button-text-content {
          font-weight: 500 !important;
        }
        .clariview-summary-btn svg {
          width: 20px !important;
          height: 20px !important;
          margin-right: 4px !important;
        }
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--yt-spec-static-brand-white);
          border-radius: 50%;
          border-top-color: transparent;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Create a temporary container and set its HTML
    const temp = document.createElement('div');
    temp.innerHTML = buttonHTML.trim();
    const buttonElement = temp.firstChild as Element;

    if (buttonElement && buttonElement instanceof Element) {
      // Add click handler
      const button = buttonElement.querySelector('button');
      if (button) {
        button.addEventListener('click', async () => {
          if (button.disabled) return;
          
          button.disabled = true;
          const originalContent = button.innerHTML;
          button.innerHTML = `
            <div class="yt-spec-button-shape-next__icon" aria-hidden="true">
              <div class="loading-spinner"></div>
            </div>
            <div class="yt-spec-button-shape-next__button-text-content">Loading...</div>
          `;

          try {
            const transcript = await getYouTubeTranscript(window.location.href);
            if (transcript) {
              const event = new CustomEvent('create-clariview-popup', {
                detail: { selectedText: transcript }
              });
              document.dispatchEvent(event);
            } else {
              alert('No transcript available for this video');
            }
          } catch (error) {
            console.error('Failed to get transcript:', error);
            alert('Failed to get video transcript');
          } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
          }
        });
      }

      // Insert the button after the like/dislike buttons but before the Share button
      const likeDislikeButton = menuContainer.querySelector('segmented-like-dislike-button-view-model');
      if (likeDislikeButton) {
        likeDislikeButton.insertAdjacentElement('afterend', buttonElement);
      } else {
        menuContainer.insertBefore(buttonElement, menuContainer.firstChild);
      }
    }
  });
}

// Initialize the global object for our functions
(function initializeYouTubeHelper() {
  // Create a namespace for our functions
  window.clariviewYT = {
    insertSummaryButton: insertSummaryButton,
    getYouTubeTranscript: getYouTubeTranscript
  };

  // Dispatch an event when initialization is complete
  const event = new CustomEvent('clariview-youtube-ready');
  window.dispatchEvent(event);
})(); 