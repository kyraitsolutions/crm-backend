import {
  TPublicFacebookPage,
  TPublicMetaAccount,
  TStoredFacebookPage,
} from "../types/meta-account.type.js";

export function getStoredFacebookPages(
  metaAccount: any,
): TStoredFacebookPage[] {
  if (Array.isArray(metaAccount?.facebookPages) && metaAccount.facebookPages.length) {
    return metaAccount.facebookPages;
  }

  if (metaAccount?.facebookPage?.id) {
    return [metaAccount.facebookPage];
  }

  return [];
}

export function getActiveFacebookPage(
  metaAccount: any,
): TStoredFacebookPage | null {
  const pages = getStoredFacebookPages(metaAccount);
  if (!pages.length) return null;

  return (
    pages.find((page) => page.id === metaAccount?.activePageId) || pages[0]
  );
}

export function toPublicFacebookPage(
  page?: TStoredFacebookPage | null,
): TPublicFacebookPage | null {
  if (!page?.id) return null;

  const { accessToken, ...rest } = page;
  return rest;
}

export function toPublicMetaAccount(metaAccount: any): TPublicMetaAccount | null {
  if (!metaAccount) return null;

  const json =
    typeof metaAccount.toJSON === "function"
      ? metaAccount.toJSON()
      : metaAccount;

  const pages = getStoredFacebookPages(json).map(
    (page) => toPublicFacebookPage(page) as TPublicFacebookPage,
  );
  const activePage =
    pages.find((page) => page.id === json.activePageId) || pages[0] || null;

  return {
    ...json,
    facebookPages: pages,
    activePageId: activePage?.id ?? null,
    facebookPage: activePage,
    instagram: activePage?.instagram ?? json.instagram ?? null,
    webhookSubscribed:
      activePage?.webhookSubscribed ?? json.webhookSubscribed ?? false,
  };
}
