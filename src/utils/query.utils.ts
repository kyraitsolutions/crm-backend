import type { ParsedQs } from "qs";
import { TQueryParams } from "../types/api-response.type";

type TParseQueryOptions = {
  defaultPage?: number;
  defaultLimit?: number;
};

const RESERVED_FIELDS = ["page", "limit", "search", "sortBy", "sortOrder"];

export const parseQueryParams = <TFilters = Record<string, any>>(
  query: ParsedQs,
  options?: TParseQueryOptions,
): TQueryParams<TFilters> => {
  const { defaultPage = 1, defaultLimit = 50 } = options || {};

  const filters: Record<string, any> = {};

  Object.entries(query).forEach(([key, value]) => {
    if (!RESERVED_FIELDS.includes(key)) {
      filters[key] = value;
    }
  });

  return {
    page: Number(query.page) || defaultPage,
    limit: Number(query.limit) || defaultLimit,
    search: query.search as string,
    sortBy: query.sortBy as string,
    sortOrder: query.sortOrder as "asc" | "desc",
    filters: filters as TFilters,
  };
};
