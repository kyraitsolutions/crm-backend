export type MetaLeadgenWebhookValue = {
  leadgen_id?: string;
  page_id?: string;
  form_id?: string;
  adgroup_id?: string;
  ad_id?: string;
  created_time?: number | string;
};

export type MetaLeadgenField = {
  name?: string;
  values?: string[];
};

export type MetaLeadgenDetails = {
  id?: string;
  created_time?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  is_organic?: boolean;
  field_data?: MetaLeadgenField[];
};
