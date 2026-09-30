export function splitSpeech(text) {
  return (
    text
      .match(/[^.!?]+[.!?]+(?:[”"']+)?|[^.!?]+$/g)
      ?.map((part) => part.trim())
      .filter(Boolean) || [text]
  );
}

export const normalizeSpeech = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function heardSegmentCount(segments, heardText) {
  const heard = normalizeSpeech(heardText);
  let prefix = '';
  let count = 0;
  for (const segment of segments) {
    prefix = normalizeSpeech(`${prefix} ${segment.text}`);
    if (heard === prefix || heard.startsWith(`${prefix} `)) count++;
    else break;
  }
  return count;
}
