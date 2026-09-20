import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

export async function exceljsWorkbook(
  build: (workbook: ExcelJS.Workbook) => void | Promise<void>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await build(workbook);
  const written = await workbook.xlsx.writeBuffer();
  return Buffer.from(written);
}

export function sheetJsWorkbook(
  sheets: Array<{
    name: string;
    rows: unknown[][];
    hidden?: boolean;
  }>,
  options: { date1904?: boolean } = {},
): Buffer {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = {
    WBProps: { date1904: options.date1904 === true },
    Sheets: sheets.map((sheet) => ({
      name: sheet.name,
      Hidden: sheet.hidden ? 1 : 0,
    })),
  };
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows, { cellDates: true });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function writeStreamingXlsx(
  filePath: string,
  header: Array<string | number | boolean>,
  rows: () => Generator<Array<string | number | boolean>>,
  options: { useSharedStrings?: boolean } = {},
): Promise<number> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useSharedStrings: options.useSharedStrings === true,
    useStyles: false,
  });
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(header).commit();
  let count = 0;
  for (const row of rows()) {
    sheet.addRow(row).commit();
    count += 1;
  }
  await workbook.commit();
  return count;
}
