'use client';

import { useRef, useState } from 'react';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from '@utanstore/shared';
import { api } from '@/lib/api-client';

const MAX_MB = Math.round(MAX_IMAGE_BYTES / 1024 / 1024);
const FORMAT_LABEL = ALLOWED_IMAGE_MIME.map((m) => m.split('/')[1].toUpperCase()).join(', ');

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Uploads image files to the API (base64 → object storage) and returns public
 * URLs. Shows the store owner the recommended dimensions, allowed formats
 * (including AVIF), the max size, and each image's actual dimensions + weight.
 */
export function ImageUploader({
  value,
  onChange,
  multiple = false,
  label,
  recommended,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
  /** Recommended pixel size, e.g. "1200×450". Shown as guidance. */
  recommended?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // url -> "800×800 · 240 KB" (dimensions filled on <img> load; size on upload)
  const [meta, setMeta] = useState<Record<string, { size?: number; dims?: string }>>({});

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const uploaded: { url: string; size: number }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setErr(`"${file.name}" is not an image.`);
          continue;
        }
        if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
          setErr(`${file.type} is not supported. Allowed: ${FORMAT_LABEL}.`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setErr(`"${file.name}" is ${humanSize(file.size)} — max is ${MAX_MB}MB.`);
          continue;
        }
        const dataBase64 = await fileToBase64(file);
        const res = await api.post<{ url: string }>('/admin/uploads/image', {
          filename: file.name,
          contentType: file.type,
          dataBase64,
        });
        uploaded.push({ url: res.url, size: file.size });
        if (!multiple) break;
      }
      if (uploaded.length) {
        setMeta((m) => {
          const next = { ...m };
          for (const u of uploaded) next[u.url] = { ...next[u.url], size: u.size };
          return next;
        });
        onChange(multiple ? [...value, ...uploaded.map((u) => u.url)] : uploaded.slice(0, 1).map((u) => u.url));
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onImgLoad(url: string, e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const dims = `${img.naturalWidth}×${img.naturalHeight}`;
    setMeta((m) => (m[url]?.dims === dims ? m : { ...m, [url]: { ...m[url], dims } }));
  }

  return (
    <div>
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <div className="flex flex-wrap items-start gap-3">
        {value.map((url, i) => (
          <div key={url + i} className="w-20">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" onLoad={(e) => onImgLoad(url, e)} />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-black/60 text-xs text-white"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
            {(meta[url]?.dims || meta[url]?.size) && (
              <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-400">
                {meta[url]?.dims}
                {meta[url]?.dims && meta[url]?.size ? ' · ' : ''}
                {meta[url]?.size ? humanSize(meta[url]!.size!) : ''}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-emerald-400 disabled:opacity-50"
        >
          {busy ? 'Uploading…' : multiple || value.length === 0 ? '+ Image' : 'Replace'}
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-400">
        {recommended ? `Recommended ${recommended}px · ` : ''}
        {FORMAT_LABEL} · max {MAX_MB}MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIME.join(',')}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
    </div>
  );
}
