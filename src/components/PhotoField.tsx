"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import styles from "./photoField.module.css";

const MAX_WIDTH = 1000;
const MAX_HEIGHT = 1250;

// Shrinks a chosen photo in the browser before it is sent, so a phone photo of
// several MB goes up as a few hundred KB. The server shrinks it again and is
// the check that counts; if the browser cannot decode the file (some HEIC),
// the original is sent unchanged.
async function shrinkInBrowser(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

// A photo upload for a form that posts as multipart/form-data. Shows what is
// there now (or the one just chosen) and lets it be replaced or removed.
export function PhotoField({
  name = "photo",
  currentUrl,
  alt,
}: {
  name?: string;
  currentUrl?: string | null;
  alt: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const objectUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    []
  );

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const small = await shrinkInBrowser(file);
    if (small !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(small);
      input.files = transfer.files;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(small);
    setPreview(objectUrl.current);
    setRemoved(false);
  }

  function remove() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setRemoved(true);
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Photo
      </label>
      <div className={styles.row}>
        <div className={styles.thumb}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={alt} />
          ) : (
            <span aria-hidden="true">No photo</span>
          )}
        </div>
        <div className={styles.actions}>
          <label className={`btn ${styles.choose}`}>
            {preview ? "Choose a different photo" : "Upload a photo"}
            <input
              ref={inputRef}
              id={id}
              name={name}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onChange}
            />
          </label>
          {preview && (
            <button type="button" className="btn-quiet" onClick={remove}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <input type="hidden" name="removePhoto" value={removed ? "1" : ""} />
    </div>
  );
}
