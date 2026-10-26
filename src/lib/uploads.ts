"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { UploadedDoc } from "./types";

export type UploadPurpose = "avatar" | "thumbnail" | "application-doc";

// POST /uploads. The API checks the real file type and the 5 MB limit; the
// result ({ id, url, name, type, size }) is what profiles, courses and
// applications reference. Application documents get a private url.
export const uploadFile = (file: File, purpose: UploadPurpose) => {
  const form = new FormData();
  form.set("purpose", purpose);
  form.set("file", file);
  return api<Required<Pick<UploadedDoc, "id" | "url">> & UploadedDoc>("/uploads", { method: "POST", body: form });
};

// Private files (application documents) live behind /uploads/private/:id
const PRIVATE_PATH = "/uploads/private/";
export const isPrivateUrl = (url?: string) => !!url?.includes(PRIVATE_PATH);

// A short-lived signed link to a private file (uploader and admins only)
export const privateLink = async (url: string) =>
  (await api<{ url: string }>(PRIVATE_PATH + url.split(PRIVATE_PATH)[1])).url;

// The url to show: public urls as they are, private ones once signed
export function useViewableUrl(url?: string, enabled = true) {
  const [signed, setSigned] = useState<{ for: string; url: string }>();
  const needsLink = enabled && isPrivateUrl(url);
  useEffect(() => {
    if (!needsLink || !url) return;
    let live = true;
    privateLink(url)
      .then((link) => live && setSigned({ for: url, url: link }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [needsLink, url]);
  if (!isPrivateUrl(url)) return url;
  return signed && signed.for === url ? signed.url : undefined;
}
