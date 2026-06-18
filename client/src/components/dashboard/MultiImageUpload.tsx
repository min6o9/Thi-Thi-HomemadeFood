/**
 * Multi-image upload component — supports up to 5 images with thumbnail picker.
 * Each uploaded image can be designated as the product thumbnail.
 */

import { useRef } from 'react';
import { Upload, X, Star, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';

const MAX_IMAGES = 5;

interface MultiImageUploadProps {
  images: string[];
  thumbnailUrl: string;
  onImagesChange: (images: string[]) => void;
  onThumbnailChange: (url: string) => void;
  error?: string;
}

export function MultiImageUpload({
  images,
  thumbnailUrl,
  onImagesChange,
  onThumbnailChange,
  error,
}: MultiImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canAddMore = images.length < MAX_IMAGES;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // How many slots remain
    const slots = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, slots);

    setUploadError(null);
    setUploadingCount(toUpload.length);

    const results: string[] = [];

    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed');
        setUploadingCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Each image must be under 5 MB');
        setUploadingCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      try {
        const data = await api.uploadImage(file);
        results.push(data.url);
        setUploadingCount((n) => n - 1);
      } catch {
        setUploadError('Failed to upload one or more images');
        setUploadingCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const newImages = [...images, ...results];
    onImagesChange(newImages);

    // Auto-set thumbnail if none chosen yet
    if (!thumbnailUrl && newImages.length > 0) {
      onThumbnailChange(newImages[0]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (url: string) => {
    const newImages = images.filter((u) => u !== url);
    onImagesChange(newImages);
    // If removed image was thumbnail, promote next one
    if (thumbnailUrl === url) {
      onThumbnailChange(newImages[0] ?? '');
    }
  };

  const isUploading = uploadingCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-body-sm font-medium text-gray-700 dark:text-gray-300">
          Product Images *
          <span className="ml-2 text-caption text-gray-400 font-normal">
            ({images.length}/{MAX_IMAGES})
          </span>
        </label>
        {images.length > 0 && (
          <p className="text-caption text-gray-400">
            Click <Star className="inline w-3 h-3 mb-0.5" /> to set thumbnail
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Uploaded image cards */}
        {images.map((url) => {
          const isThumbnail = url === thumbnailUrl;
          return (
            <div
              key={url}
              className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-colors bg-gray-100 dark:bg-gray-800 ${
                isThumbnail ? 'border-burmese-ruby' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <img src={url} alt="Product" className="w-full h-full object-cover" />

              {/* Thumbnail badge */}
              {isThumbnail && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-burmese-ruby text-white text-caption px-1.5 py-0.5 rounded-full font-medium">
                  <Star className="w-3 h-3 fill-white" />
                  Thumbnail
                </div>
              )}

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!isThumbnail && (
                  <button
                    type="button"
                    onClick={() => onThumbnailChange(url)}
                    title="Set as thumbnail"
                    className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-800 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  title="Remove image"
                  className="p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Upload slot */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600
              hover:border-burmese-ruby dark:hover:border-burmese-ruby
              flex flex-col items-center justify-center gap-1
              text-gray-400 hover:text-burmese-ruby transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-caption">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-caption font-medium">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {uploadError && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-body-sm">{uploadError}</p>
        </div>
      )}

      {error && !uploadError && (
        <p className="text-body-sm text-red-500">{error}</p>
      )}

      {images.length === 0 && !isUploading && (
        <p className="text-caption text-gray-400">
          Upload up to {MAX_IMAGES} images. The first image becomes the thumbnail automatically.
        </p>
      )}
    </div>
  );
}
