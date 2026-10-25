"use client";

import { useId, type ChangeEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { UploadedDoc } from "@/lib/types";

// Files under this size are kept as data URLs so the preview survives a refresh
const PERSIST_LIMIT = 700 * 1024;
const MAX_SIZE = 5 * 1024 * 1024;

interface FileInputProps {
  label: string;
  accept: string;
  value?: UploadedDoc;
  onChange: (doc: UploadedDoc | undefined) => void;
  error?: string;
  hint?: string;
}

// Reads the picked file locally for preview only; nothing is uploaded
export default function FileInput({ label, accept, value, onChange, error, hint }: FileInputProps) {
  const id = useId();

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error("Files must be smaller than 5MB.");
      return;
    }
    const meta = { name: file.name, type: file.type, size: file.size };
    if (file.size > PERSIST_LIMIT) {
      onChange({ ...meta, dataUrl: URL.createObjectURL(file) });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ ...meta, dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface/50 p-2.5">
          <DocPreview doc={value} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{value.name}</p>
            <p className="text-xs text-muted-foreground">{Math.round(value.size / 1024)} KB · local preview</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-surface hover:text-red-600"
            aria-label={`Remove ${label}`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed px-3 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:bg-surface/50 transition-colors ${error ? "border-red-500" : "border-border"}`}
        >
          <Upload size={18} className="text-primary" />
          <span>Choose file</span>
        </label>
      )}
      <input id={id} type="file" accept={accept} onChange={handleFile} className="sr-only" />
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function DocPreview({ doc, large }: { doc: UploadedDoc; large?: boolean }) {
  const size = large ? "w-full h-48" : "w-12 h-12";
  if (doc.type.startsWith("image/") && doc.dataUrl) {
    return <img src={doc.dataUrl} alt={doc.name} className={`${size} rounded-md object-cover bg-background`} />;
  }
  const content = (
    <div className={`${size} rounded-md bg-background border border-border flex flex-col items-center justify-center gap-1 text-muted-foreground`}>
      <FileText size={large ? 32 : 20} />
      {large && <span className="text-xs">{doc.dataUrl ? "Open document" : "Demo document (no file)"}</span>}
    </div>
  );
  return doc.dataUrl && large ? (
    <a href={doc.dataUrl} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80">
      {content}
    </a>
  ) : (
    content
  );
}
