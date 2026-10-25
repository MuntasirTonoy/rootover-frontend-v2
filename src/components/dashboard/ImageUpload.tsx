"use client";

import type { ChangeEvent } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}

// Small images are kept as data URLs so they survive a refresh; nothing is uploaded
const PERSIST_LIMIT = 700 * 1024;

export default function ImageUpload({ value, onChange, label = "Thumbnail" }: ImageUploadProps) {
  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Images must be smaller than 5MB.");
    if (file.size > PERSIST_LIMIT) {
      toast.info("Large image: the preview will be lost after a refresh.");
      onChange(URL.createObjectURL(file));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <span className="block text-sm font-semibold text-foreground mb-1.5">{label}</span>
      {value ? (
        <div className="relative w-full max-w-sm overflow-hidden rounded-md border border-border">
          <img src={value} alt="Thumbnail preview" className="aspect-video w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-red-600"
            aria-label="Remove thumbnail"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/50 hover:bg-surface/50">
          <Upload size={20} className="text-primary" />
          <span>Upload an image (optional)</span>
          <span className="text-xs">Without one, a tile coloured by level is generated.</span>
          <input type="file" accept="image/*" onChange={handleUpload} className="sr-only" />
        </label>
      )}
    </div>
  );
}
