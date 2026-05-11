type PaginationProps = {
  page: number;
  limit: number;
  totalDocs: number;
  docsCount: number;
};

export const buildPagination = ({
  page,
  limit = 50,
  docsCount,
  totalDocs,
}: PaginationProps) => {
  const totalPages = Math.ceil(totalDocs / limit);

  return {
    page,
    limit,
    totalDocs,
    totalPages,
    docsCount,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,

    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};
