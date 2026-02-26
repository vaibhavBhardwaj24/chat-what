"use client";

import { useEffect, useState } from "react";
import { getLinkPreview, LinkPreviewData } from "@/app/actions/getLinkPreview";
import Image from "next/image";

export function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      try {
        const data = await getLinkPreview(url);
        if (mounted && data) {
          setPreview(data);
        }
      } catch (err) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPreview();
    return () => {
      mounted = false;
    };
  }, [url]);

  if (loading) return null;
  if (!preview || error) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 max-w-[300px] sm:max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {preview.image && (
        <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-800">
          <img
            src={preview.image}
            alt={preview.title || "Link preview image"}
            className="object-cover w-full h-full"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-3">
        {preview.siteName && (
          <p className="text-[10px] uppercase font-semibold text-gray-500 mb-1">
            {preview.siteName}
          </p>
        )}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
          {preview.title || new URL(preview.url).hostname}
        </h3>
        {preview.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
