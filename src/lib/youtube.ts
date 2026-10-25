const YOUTUBE_ID = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?"]*).*/;

export function getYoutubeId(url: string | undefined): string | null {
  if (!url || !/youtube\.com|youtu\.be|youtube-nocookie\.com/.test(url)) return null;
  const match = url.match(YOUTUBE_ID);
  return match && match[2].length === 11 ? match[2] : null;
}

// Accepts a YouTube watch/share/embed URL or pasted <iframe> embed code and
// returns the embeddable URL, or null when it isn't a supported YouTube link
export function toEmbedUrl(input: string): string | null {
  const iframeSrc = input.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
  const id = getYoutubeId((iframeSrc ?? input).trim());
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function getEmbedUrl(url: string | undefined): string {
  return (url && toEmbedUrl(url)) || url || "";
}

export function getThumbnailUrl(url: string | undefined): string | null {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
