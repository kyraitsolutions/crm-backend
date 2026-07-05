import type { ParsedQs } from "qs";
import type { TQueryParams } from "../types/api-response.type.js";

type TParseQueryOptions = {
  defaultPage?: number;
  defaultLimit?: number;
  allowedFilters?: readonly string[];
};

const RESERVED_QUERY_PARAMS = [
  "page",
  "limit",
  "search",
  "sortBy",
  "sortOrder",
] as const;

export const parseQueryParams = <TFilters = Record<string, unknown>>(
  query: ParsedQs,
  options: TParseQueryOptions = {},
): TQueryParams<TFilters> => {
  const { defaultPage = 1, defaultLimit = 50, allowedFilters = [] } = options;

  const allowedQueryParams = new Set<string>([
    ...RESERVED_QUERY_PARAMS,
    ...allowedFilters,
  ]);

  const unknownQueryParams = Object.keys(query).filter(
    (key) => !allowedQueryParams.has(key),
  );

  if (unknownQueryParams.length > 0) {
    throw new Error(
      `Unknown query parameter(s): ${unknownQueryParams.join(", ")}`,
    );
  }

  const filters: Record<string, unknown> = {};

  for (const key of allowedFilters) {
    if (query[key] !== undefined) {
      filters[key] = query[key];
    }
  }

  return {
    page: Number(query.page) || defaultPage,
    limit: Number(query.limit) || defaultLimit,
    search: query.search as string | undefined,
    sortBy: query.sortBy as string | undefined,
    sortOrder: query.sortOrder as "asc" | "desc" | undefined,
    filters: filters as TFilters,
  };
};

// import type { ParsedQs } from "qs";
// import { TQueryParams } from "../types/api-response.type.js";

// type TParseQueryOptions = {
//   defaultPage?: number;
//   defaultLimit?: number;
// };

// const ALLOWED_QUERY_PARAMS = [
//   "page",
//   "limit",
//   "search",
//   "sortBy",
//   "sortOrder",
//   "filters",
// ] as const;

// const RESERVED_FIELDS = ["page", "limit", "search", "sortBy", "sortOrder"];

// export const parseQueryParams = <TFilters = Record<string, any>>(
//   query: ParsedQs,
//   options?: TParseQueryOptions,
// ): TQueryParams<TFilters> => {
//   const { defaultPage = 1, defaultLimit = 50 } = options || {};

//   const filters: Record<string, any> = {};

//   Object.entries(query).forEach(([key, value]) => {
//     if (!RESERVED_FIELDS.includes(key)) {
//       filters[key] = value;
//     }
//   });

//   return {
//     page: Number(query.page) || defaultPage,
//     limit: Number(query.limit) || defaultLimit,
//     search: query.search as string,
//     sortBy: query.sortBy as string,
//     sortOrder: query.sortOrder as "asc" | "desc",
//     filters: filters as TFilters,
//   };
// };
