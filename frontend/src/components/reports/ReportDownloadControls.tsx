import { useState } from "react";
import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileType2,
  RectangleHorizontal,
  RectangleVertical,
} from "lucide-react";
import type { DownloadFormat, PdfOrientation } from "../../lib/reporting";

interface PdfOrientationDropdownProps {
  value: PdfOrientation;
  onChange: (value: PdfOrientation) => void;
}

interface DownloadFormatDropdownProps {
  value: DownloadFormat;
  onChange: (value: DownloadFormat) => void;
}

const downloadFormatOptions = [
  { value: "pdf" as const, label: "PDF", Icon: FileText },
  { value: "xlsx" as const, label: "XLSX", Icon: FileSpreadsheet },
  { value: "csv" as const, label: "CSV", Icon: FileType2 },
];

export function PdfOrientationDropdown({ value, onChange }: PdfOrientationDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = value === "landscape"
    ? { label: "Landscape", Icon: RectangleHorizontal }
    : { label: "Portrait", Icon: RectangleVertical };

  return (
    <div className="relative min-w-36">
      <span className="mb-2 block text-sm font-semibold text-ink/80">Orientation</span>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-moss/15 bg-white/85 px-4 py-3 text-sm font-semibold text-ink"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2">
          <selected.Icon size={16} className="text-fern" />
          {selected.label}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-[110] mt-2 w-full min-w-40 rounded-2xl border border-moss/10 bg-white p-2 shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-moss/8"
            onClick={() => {
              onChange("landscape");
              setOpen(false);
            }}
          >
            <RectangleHorizontal size={16} className="text-fern" />
            Landscape
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-moss/8"
            onClick={() => {
              onChange("portrait");
              setOpen(false);
            }}
          >
            <RectangleVertical size={16} className="text-fern" />
            Portrait
          </button>
        </div>
      )}
    </div>
  );
}

export function DownloadFormatDropdown({ value, onChange }: DownloadFormatDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = downloadFormatOptions.find((option) => option.value === value) || downloadFormatOptions[0];

  return (
    <div className="relative min-w-32">
      <span className="mb-2 block text-sm font-semibold text-ink/80">Download type</span>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-moss/15 bg-white/85 px-4 py-3 text-sm font-semibold text-ink"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2">
          <selected.Icon size={16} className="text-fern" />
          {selected.label}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-[110] mt-2 w-full min-w-32 rounded-2xl border border-moss/10 bg-white p-2 shadow-card">
          {downloadFormatOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-moss/8"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <option.Icon size={16} className="text-fern" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
