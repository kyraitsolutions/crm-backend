const MS_PER_DAY = 86_400_000;
const EXCEL_1900_EPOCH = Date.UTC(1899, 11, 30);
const EXCEL_1904_EPOCH = Date.UTC(1904, 0, 1);

export function excelSerialToIso(serial: number, date1904: boolean): string {
  const epoch = date1904 ? EXCEL_1904_EPOCH : EXCEL_1900_EPOCH;
  const utc = epoch + Math.round(serial * MS_PER_DAY);
  const date = new Date(utc);
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const fraction = Math.abs(serial % 1);
  if (fraction < 1e-12) {
    return `${year}-${month}-${day}`;
  }
  return `${year}-${month}-${day}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}.000Z`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
