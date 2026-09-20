export type TStoredInstagramAccount = {
  id: string;
  username: string | null;
  name: string | null;
  profilePictureUrl: string | null;
} | null;

export type TStoredFacebookPage = {
  id: string;
  name: string;
  username: string | null;
  category: string | null;
  link: string | null;
  picture: string | null;
  about: string | null;
  description: string | null;
  tasks: string[];
  accessToken?: string;
  webhookSubscribed?: boolean;
  instagram?: TStoredInstagramAccount;
};

export type TPublicFacebookPage = Omit<TStoredFacebookPage, "accessToken">;

export type TPublicMetaAccount = {
  id?: string;
  _id?: string;
  integrationId: string;
  facebookPages: TPublicFacebookPage[];
  activePageId: string | null;
  facebookPage: TPublicFacebookPage | null;
  instagram: TStoredInstagramAccount;
  isConnected: boolean;
  connectedAt?: Date | string;
  webhookSubscribed: boolean;
  onboardingCompleted: boolean;
};
