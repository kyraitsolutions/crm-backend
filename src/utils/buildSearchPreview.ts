export const buildSearchPreview = ({
  text,
  search,
  previewLength = 80,
}: {
  text: string;
  search: string;
  previewLength?: number;
}) => {
  if (!text || !search) return text;

  const lowerText = text.toLowerCase();
  const lowerSearch = search.toLowerCase();

  const matchIndex = lowerText.indexOf(lowerSearch);

  // search not found
  if (matchIndex === -1) {
    return text.slice(0, previewLength);
  }

  // start around matched keyword
  const start = Math.max(0, matchIndex - 30);

  const end = Math.min(text.length, matchIndex + lowerSearch.length + 50);

  let preview = text.slice(start, end);

  // prepend ...
  if (start > 0) {
    preview = `...${preview}`;
  }

  // append ...
  if (end < text.length) {
    preview = `${preview}...`;
  }

  return preview;
};
