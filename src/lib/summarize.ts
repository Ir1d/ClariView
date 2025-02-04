import { getYouTubeTranscript } from './youtube';

export async function getSummarizableContent(url: string): Promise<string | null> {
  // Check if it's a YouTube URL
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return await getYouTubeTranscript(url);
  }
  
  // ... existing logic for other websites ...
}

export async function summarizeContent(url: string): Promise<string | null> {
  const content = await getSummarizableContent(url);
  if (!content) return null;

  // Use your existing summarization logic with the content
  // ... rest of your summarization code ...
} 