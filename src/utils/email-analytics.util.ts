export type CampaignCounts = {
  totalRecipients?: number;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  bouncedCount?: number;
  unsubscribedCount?: number;
  complainedCount?: number;
  failedCount?: number;
};

const pct = (num: number, den: number) => {
  if (!den || den <= 0) return 0;
  return Number(((num / den) * 100).toFixed(2));
};

export const campaignRates = (counts: CampaignCounts) => {
  const sent = Number(counts.sentCount || 0);
  const delivered = Number(counts.deliveredCount || 0);
  const opened = Number(counts.openedCount || 0);
  const clicked = Number(counts.clickedCount || 0);
  const bounced = Number(counts.bouncedCount || 0);
  const unsubscribed = Number(counts.unsubscribedCount || 0);

  return {
    deliveryRate: pct(delivered, sent),
    openRate: pct(opened, delivered || sent),
    clickRate: pct(clicked, delivered || sent),
    clickToOpenRate: pct(clicked, opened),
    bounceRate: pct(bounced, sent),
    unsubscribeRate: pct(unsubscribed, delivered || sent),
  };
};

export const normalizeEmail = (value?: string) =>
  String(value || "").trim().toLowerCase();

export const isValidEmailFormat = (value?: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export const dedupeRecipients = <T extends { email?: string }>(items: T[]) => {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicates = 0;
  for (const item of items) {
    const email = normalizeEmail(item.email);
    if (!email) continue;
    if (seen.has(email)) {
      duplicates += 1;
      continue;
    }
    seen.add(email);
    unique.push({ ...item, email } as T);
  }
  return { unique, duplicates };
};
