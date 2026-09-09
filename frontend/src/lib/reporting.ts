export type DownloadFormat = "pdf" | "xlsx" | "csv";
export type PdfOrientation = "landscape" | "portrait";

interface SpreadsheetReportOptions {
  headers: string[];
  rows: string[][];
  filename: string;
  worksheetName: string;
  companyName: string;
  companyAddress: string;
  title?: string;
  subtitle?: string;
  columnWidth?: number;
  styleCompanyAddress?: boolean;
}

interface PdfReportOptions {
  element: HTMLElement;
  filename: string;
  orientation: PdfOrientation;
  contextErrorMessage: string;
  waitForRender?: boolean;
  logoUrl?: string;
}

export function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(year, value, 0).getDate();
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[character] || character));
}

export function loadStoredValue(storageKey: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(storageKey) || fallback;
}

export function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadTextFile(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadXlsx({
  headers,
  rows,
  filename,
  worksheetName,
  companyName,
  companyAddress,
  title,
  subtitle,
  columnWidth = 16,
  styleCompanyAddress = true,
}: SpreadsheetReportOptions) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);
  const reportHeadingRows = [title, subtitle].filter((value): value is string => Boolean(value));

  worksheet.addRow([companyName || "Company"]);
  worksheet.mergeCells(1, 1, 1, headers.length);
  worksheet.addRow([companyAddress || ""]);
  worksheet.mergeCells(2, 1, 2, headers.length);
  reportHeadingRows.forEach((heading, index) => {
    const rowNumber = index + 3;
    worksheet.addRow([heading]);
    worksheet.mergeCells(rowNumber, 1, rowNumber, headers.length);
  });

  const headerRowNumber = reportHeadingRows.length + 3;
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));

  worksheet.getRow(1).font = { bold: true, size: 14, color: { argb: "FF214E45" } };
  if (styleCompanyAddress) {
    worksheet.getRow(2).font = { italic: true, color: { argb: "FF53665F" } };
  }
  if (title) {
    worksheet.getRow(3).font = { bold: true, size: 12, color: { argb: "FF214E45" } };
  }
  worksheet.getRow(headerRowNumber).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(headerRowNumber).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF214E45" } };
  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  worksheet.columns.forEach((column) => {
    column.width = columnWidth;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf({
  element,
  filename,
  orientation,
  contextErrorMessage,
  waitForRender = false,
  logoUrl,
}: PdfReportOptions) {
  if (waitForRender) {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  let renderElement = element;
  let temporaryElement: HTMLElement | null = null;
  if (logoUrl && !element.querySelector("[data-org-logo='true']")) {
    temporaryElement = element.cloneNode(true) as HTMLElement;
    temporaryElement.style.position = "fixed";
    temporaryElement.style.left = "-100000px";
    temporaryElement.style.top = "0";
    temporaryElement.style.width = `${element.clientWidth}px`;
    temporaryElement.style.height = "auto";
    temporaryElement.style.pointerEvents = "none";
    temporaryElement.style.zIndex = "-1";

    const logo = document.createElement("img");
    logo.dataset.orgLogo = "true";
    logo.src = logoUrl;
    logo.alt = "Organization logo";
    logo.style.cssText = "display:block;width:72px;height:54px;flex-shrink:0;object-fit:contain;";
    const companyHeader = temporaryElement.querySelector<HTMLElement>(".company-header");
    if (companyHeader) {
      companyHeader.style.display = "flex";
      companyHeader.style.alignItems = "center";
      companyHeader.style.justifyContent = "center";
      companyHeader.style.gap = "14px";
      companyHeader.style.textAlign = "left";
      companyHeader.prepend(logo);
    } else {
      const logoHeader = document.createElement("div");
      logoHeader.style.cssText = "display:flex;align-items:center;justify-content:flex-start;min-height:64px;margin:0 0 14px;padding:0 0 10px;border-bottom:2px solid #214e45;box-sizing:border-box;";
      logoHeader.appendChild(logo);
      temporaryElement.prepend(logoHeader);
    }
    document.body.appendChild(temporaryElement);
    await new Promise<void>((resolve) => {
      if (logo.complete) {
        resolve();
      } else {
        logo.addEventListener("load", () => resolve(), { once: true });
        logo.addEventListener("error", () => resolve(), { once: true });
      }
    });
    renderElement = temporaryElement;
  }

  try {
    const canvas = await html2canvas(renderElement, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: renderElement.clientWidth,
      width: renderElement.clientWidth,
    });
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const margin = 24;
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
    const sourcePageHeight = Math.max(1, Math.floor(canvas.width * (pageHeight / pageWidth)));
    const pageCanvas = document.createElement("canvas");
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error(contextErrorMessage);

    for (let sourceY = 0; sourceY < canvas.height; sourceY += sourcePageHeight) {
      const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (sourceY > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, pageWidth, (sliceHeight / canvas.width) * pageWidth);
    }

    pdf.save(filename);
  } finally {
    temporaryElement?.remove();
  }
}
