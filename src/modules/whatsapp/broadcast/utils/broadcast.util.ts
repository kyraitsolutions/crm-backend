export function toWhatsAppRecipient(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function normalizeKeyword(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

export function matchesKeyword(text: string, keywords: string[]) {
  const incoming = normalizeKeyword(text);
  if (!incoming) return false;
  return keywords.some((keyword) => normalizeKeyword(keyword) === incoming);
}

export function campaignRates(campaign: {
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  repliedCount?: number;
  failedCount?: number;
  optedOutCount?: number;
}) {
  const sent = Number(campaign.sentCount || 0);
  const delivered = Number(campaign.deliveredCount || 0);
  const read = Number(campaign.readCount || 0);
  const replied = Number(campaign.repliedCount || 0);
  const failed = Number(campaign.failedCount || 0);
  const optedOut = Number(campaign.optedOutCount || 0);
  const attempted = sent + failed;
  const pct = (num: number, den: number) =>
    den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0;

  return {
    deliveryRate: pct(delivered || sent, sent),
    readRate: pct(read, delivered || sent),
    replyRate: pct(replied, delivered || sent),
    failRate: pct(failed, attempted),
    optOutRate: pct(optedOut, sent),
  };
}

export function buildTemplateComponents(template: any, contact: { name?: string }) {
  const components: Array<Record<string, unknown>> = [];
  const name = contact.name?.trim() || "there";

  for (const component of template.components || []) {
    const type = String(component.type || "").toUpperCase();
    const text = String(component.text || "");
    const placeholders = [...text.matchAll(/\{\{(\d+)\}\}/g)];
    if (!placeholders.length) continue;

    if (type === "BODY" || type === "HEADER") {
      components.push({
        type: type.toLowerCase(),
        parameters: placeholders.map(() => ({ type: "text", text: name })),
      });
    }
  }

  return components.length ? components : undefined;
}

export function formatMessagingTier(tier?: string) {
  const value = String(tier || "UNKNOWN");
  const match = value.match(/TIER_(\d+K?|\d+|UNLIMITED)/i);
  if (!match) return value;
  const limit = match[1].replace("K", "000");
  if (value.includes("UNLIMITED")) return "Unlimited";
  return `Tier ${match[1]} (${limit}/24 Hours)`;
}
