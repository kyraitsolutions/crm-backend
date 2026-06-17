// analytics-date.util.ts

interface GetDateRangeParams {
  range?: string;
  startDate?: string;
  endDate?: string;
}

export const getDateRange = (filters: GetDateRangeParams) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  switch (filters.range) {
    case "14days": {
      startDate = new Date();
      startDate.setDate(now.getDate() - 13);
      break;
    }

    case "30days": {
      startDate = new Date();
      startDate.setDate(now.getDate() - 29);
      break;
    }

    case "custom": {
      startDate = new Date(filters.startDate!);
      endDate = new Date(filters.endDate!);
      break;
    }

    case "today": {
      startDate = new Date(now);
      endDate = new Date(now);
      break;
    }

    case "yesterday": {
      startDate = new Date();
      startDate.setDate(now.getDate() - 1);

      endDate = new Date();
      endDate.setDate(now.getDate() - 1);

      break;
    }

    case "1year": {
      startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    }

    case "7days":
    default: {
      startDate = new Date();
      startDate.setDate(now.getDate() - 6);
      break;
    }
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate,
    endDate,
  };
};

interface GetPreviousDateRangeParams {
  startDate: Date;

  endDate: Date;
}

export const getPreviousDateRange = ({
  startDate,
  endDate,
}: GetPreviousDateRangeParams) => {
  const diff = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate);
  previousEnd.setMilliseconds(-1);
  const previousStart = new Date(previousEnd.getTime() - diff);

  return {
    previousStart,
    previousEnd,
  };
};
