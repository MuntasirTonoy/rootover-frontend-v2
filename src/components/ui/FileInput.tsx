"use client";

import { useId, useState, type ChangeEvent } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/api";
import type { UploadedDoc } from "@/lib/types";
import { privateLink, uploadFile, useViewableUrl, type UploadPurpose } from "@/lib/uploads";

const MAX_SIZE = 5 * 1024 * 1024;

interface FileInputProps {
  label: string;
  accept: string;
  purpose: UploadPurpose;
  value?: UploadedDoc;
  onChange: (doc: UploadedDoc | undefined) => void;
  error?: string;
  hint?: string;
}

// Uploads the picked file at once (POST /uploads) and hands back the upload,
// which the form then references by id
export default function FileInput({ label, accept, purpose, value, onChange, error, hint }: FileInputProps) {
  const id = useId();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // The API enforces the limit too; this just saves a pointless upload
    if (file.size > MAX_SIZE) {
      toast.error("Files must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadFile(file, purpose));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
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
            <p className="text-xs text-muted-foreground">{Math.round(value.size / 1024)} KB · uploaded</p>
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
          className={`flex items-center gap-3 rounded-md border-2 border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors ${
            uploading ? "cursor-wait opacity-70" : "cursor-pointer hover:border-primary/50 hover:bg-surface/50"
          } ${error ? "border-red-500" : "border-border"}`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin text-primary" /> : <Upload size={18} className="text-primary" />}
          <span>{uploading ? "Uploading..." : "Choose file"}</span>
        </label>
      )}
      <input id={id} type="file" accept={accept} onChange={handleFile} disabled={uploading} className="sr-only" />
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

// Images show inline; other files (PDFs) open in a new tab. Private documents
// are fetched through a short-lived signed link.
export function DocPreview({ doc, large }: { doc: UploadedDoc; large?: boolean }) {
  const isImage = doc.type.startsWith("image/");
  const src = useViewableUrl(doc.url, isImage);
  const size = large ? "w-full h-48" : "w-12 h-12";
  if (isImage && src) {
    return <img src={src} alt={doc.name} className={`${size} rounded-md object-cover bg-background`} />;
  }

  const open = async () => {
    if (!doc.url) return;
    // Open the tab first (in the click) so pop-up blockers allow it
    // ("noopener" would make window.open return null, so the opener is cut by hand)
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = doc.url.includes("/uploads/private/") ? await privateLink(doc.url) : doc.url;
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      toast.error(errorMessage(err));
    }
  };

  const content = (
    <div className={`${size} rounded-md bg-background border border-border flex flex-col items-center justify-center gap-1 text-muted-foreground`}>
      <FileText size={large ? 32 : 20} />
      {large && <span className="text-xs">{doc.url ? "Open document" : "No file attached"}</span>}
    </div>
  );
  return doc.url && large ? (
    <button type="button" onClick={open} className="block w-full hover:opacity-80">
      {content}
    </button>
  ) : (
    content
  );
}
