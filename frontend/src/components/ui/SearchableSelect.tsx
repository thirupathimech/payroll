import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface SearchableOption {
  value: string;
  label: string;
  searchText?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  renderOption?: (option: SearchableOption) => ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}

export function SearchableSelect({
  label,
  placeholder = "Search and select",
  value,
  options,
  onChange,
  renderOption,
  disabled,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const wrapperRef = useRef<HTMLLabelElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption?.label]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selectedOption?.label ?? "");
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [selectedOption?.label]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const searchable = `${option.label} ${option.searchText ?? ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [options, query]);

  function choose(option: SearchableOption) {
    if (option.disabled) {
      return;
    }
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
    setHighlightedIndex(0);
  }

  return (
    <label ref={wrapperRef} className="relative block space-y-2 text-sm font-semibold text-ink/80">
      {label && <span>{label}</span>}
      <input
        className="w-full rounded-2xl border border-moss/15 bg-white/85 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-fern focus:ring-4 focus:ring-fern/10 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={(event) => {
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            setOpen(true);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((current) => Math.max(current - 1, 0));
          }
          if (event.key === "Enter" && open && filteredOptions[highlightedIndex]) {
            event.preventDefault();
            choose(filteredOptions[highlightedIndex]);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setQuery(selectedOption?.label ?? "");
          }
        }}
      />

      {open && !disabled && (
        <div className="absolute z-[80] mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-moss/10 bg-white p-2 shadow-card">
          {filteredOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                index === highlightedIndex ? "bg-moss text-white" : "text-ink hover:bg-moss/8"
              } ${option.disabled ? "cursor-not-allowed opacity-45" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {renderOption ? renderOption(option) : option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && <p className="px-3 py-2 text-sm font-semibold text-ink/45">No matches found</p>}
        </div>
      )}
    </label>
  );
}
