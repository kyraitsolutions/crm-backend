export function generateDateBuckets(startDate: Date, endDate: Date) {
  const buckets: string[] = [];

  const current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    buckets.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return buckets;
}

// export function generateDateBuckets(startDate: Date, endDate: Date) {
//   const buckets: string[] = [];

//   const current = new Date(startDate);

//   while (current <= endDate) {
//     buckets.push(current.toISOString().split("T")[0]);
//     current.setDate(current.getDate() + 1);
//   }

//   return buckets;
// }
