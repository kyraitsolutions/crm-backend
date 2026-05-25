export type TPaginationMeta = {
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
  docsCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type TQueryParams<TFilters = Record<string, any>> = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: TFilters;
};

export type TPaginatedResponse<T> = {
  docs: T[];
  pagination: TPaginationMeta;
};

type TConversationFilters = {
  status?: string;
  platform?: "whatsapp" | "instagram" | "chatbot";
};

export type TConversationQuery = TQueryParams<TConversationFilters>;
