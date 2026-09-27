export class KnowledgeIngestError extends Error {
  readonly code: string;

  constructor(userMessage: string, code: string) {
    super(userMessage);
    this.name = "KnowledgeIngestError";
    this.code = code;
  }
}

export const friendlyKnowledgeError = (error: unknown) => {
  if (error instanceof KnowledgeIngestError) return error.message;
  const raw = error instanceof Error ? error.message : String(error);
  if (/not allowed|authenticated urls|only http/i.test(raw)) {
    return "Please enter a valid public website URL.";
  }
  if (/too long to respond|could not reach|returned|redirected|no response/i.test(raw)) {
    return "We couldn't access this website. Please check that the URL is publicly accessible.";
  }
  if (/readable|javascript|enough information|not a readable/i.test(raw)) {
    return "We couldn't find enough readable information on this website.";
  }
  if (/embed/i.test(raw)) {
    return "We couldn't finish processing this knowledge source. Please try again.";
  }
  return "We couldn't finish processing this knowledge source. Please try again.";
};
