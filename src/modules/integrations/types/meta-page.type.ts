import {
  TPaginatedResponse,
  TQueryParams,
} from "../../../types/api-response.type.js";

export type TMetaPageQuery = TQueryParams;

export type TGraphError = {
  message?: string;
  code?: number;
  type?: string;
} | null;

export type TGraphPaging = {
  next?: string;
  previous?: string;
} | null;

type TGraphSummary = {
  summary?: {
    total_count?: number;
  };
};

export type TGraphPost = {
  id?: string;
  message?: string;
  story?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
  status_type?: string;
  shares?: { count?: number };
  reactions?: TGraphSummary;
  likes?: TGraphSummary;
  comments?: TGraphSummary;
  is_published?: boolean;
};

export type TGraphLeadForm = {
  id?: string;
  name?: string;
  status?: string;
  leads_count?: number;
  created_time?: string;
  locale?: string;
  questions?: TFacebookLeadFormQuestion[];
};

export type TGraphInsightValue = {
  value?: number | string | Record<string, number>;
  end_time?: string;
};

export type TGraphInsightMetric = {
  name?: string;
  title?: string;
  period?: string;
  values?: TGraphInsightValue[];
};

export type TGraphPageSnapshot = {
  id?: string;
  name?: string;
  fan_count?: number;
  followers_count?: number;
  talking_about_count?: number;
  rating_count?: number;
  overall_star_rating?: number;
};

export type TFacebookPost = {
  id: string;
  message: string | null;
  story: string | null;
  createdTime: string | null;
  permalink: string | null;
  picture: string | null;
  type: string | null;
  likes: number;
  comments: number;
  shares: number;
  isPublished: boolean;
};

export type TFacebookLeadFormQuestion = {
  key?: string;
  label?: string;
  type?: string;
};

export type TFacebookLeadForm = {
  id: string;
  name: string;
  status: string | null;
  leadsCount: number;
  createdTime: string | null;
  locale: string | null;
  questions: TFacebookLeadFormQuestion[];
};

export type TFacebookLead = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  message?: string;
  status?: string;
  stage?: string;
  createdAt?: string;
  source?: {
    name?: string;
    formId?: string;
    pageId?: string;
    leadgenId?: string;
    adId?: string;
    campaignId?: string;
    createdTime?: string | Date | null;
  };
};

export type TFacebookInsightMetric = {
  name: string;
  title: string;
  value: number | string | null;
  period: string | null;
  endTime: string | null;
};

export type TFacebookPageSnapshot = {
  id: string;
  name: string | null;
  fanCount: number | null;
  followersCount: number | null;
  talkingAboutCount: number | null;
  ratingCount: number | null;
  overallStarRating: number | null;
};

export type TFacebookInsights = {
  page: TFacebookPageSnapshot;
  metrics: TFacebookInsightMetric[];
  warning: string | null;
};

export type TConnectedFacebookPage = {
  pageId: string;
  pageName: string | null;
  accessToken: string;
};

export type TMetaPaginatedResponse<T> = TPaginatedResponse<T> & {
  warning: string | null;
};
