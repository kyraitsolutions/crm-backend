export const WHATSAPP_INTERACTIVE_LIMITS = {
  body: 1024,
  footer: 60,
  headerText: 60,
  button: {
    max: 3,
    title: 20,
    id: 256,
  },
  list: {
    maxSections: 10,
    maxRows: 10,
    button: 20,
    sectionTitle: 24,
    rowTitle: 24,
    rowDescription: 72,
    rowId: 200,
  },
  carousel: {
    minCards: 2,
    maxCards: 10,
    cardBody: 160,
    displayText: 20,
  },
} as const;
