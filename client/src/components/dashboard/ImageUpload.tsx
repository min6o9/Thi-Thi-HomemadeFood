/**
 * Image Upload Component with Cloudinary integration
 * Supports drag-and-drop, file picker, preview, and URL fallback
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Link as LinkIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface ImageUploadProps {
  value: string;
  onChange: (imageUrl: string) => void;
  error?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function ImageUpload({ value, onChange, error }: ImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      setUploadState('error');
      return;
    }

    // Validate file size (max 5MB — matches server limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      setUploadState('error');
      return;
    }

    setUploadState('uploading');
    setUploadError(null);

    try {
      const data = await api.uploadImage(file);
      onChange(data.url);
      setUploadState('success');

      // Reset to idle after 2 seconds
      setTimeout(() => setUploadState('idle'), 2000);
    } catch (err) {
      setUploadError('Failed to upload image. Please try again.');
      setUploadState('error');
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setShowUrlInput(false);
      setUrlInput('');
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    setUploadState('idle');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-body-sm font-medium text-gray-700 dark:text-gray-300">
        Product Image *
      </label>

      {!value ? (
        <>
          {/* Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center
              transition-colors cursor-pointer
              ${isDragging
                ? 'border-burmese-ruby bg-burmese-ruby/5'
                : error || uploadError
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                : 'border-gray-300 dark:border-gray-700 hover:border-burmese-ruby dark:hover:border-burmese-ruby'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploadState === 'uploading' ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-burmese-ruby animate-spin" />
                <p className="text-body-sm text-gray-600 dark:text-gray-400">
                  Uploading image...
                </p>
              </div>
            ) : uploadState === 'error' ? (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-body-sm text-red-600 dark:text-red-400">
                  {uploadError}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadState('idle');
                    setUploadError(null);
                  }}
                  className="text-body-sm text-burmese-ruby hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-body font-medium text-gray-900 dark:text-gray-100">
                    Drop image here or click to upload
                  </p>
                  <p className="text-body-sm text-gray-500 dark:text-gray-400 mt-1">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 text-body-sm font-medium text-white bg-burmese-ruby rounded-md hover:bg-burmese-ruby/90 transition-colors"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>

          {/* URL Input Toggle */}
          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-2 text-body-sm text-gray-600 dark:text-gray-400 hover:text-burmese-ruby transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              Or enter image URL
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-body-sm focus:outline-none focus:ring-2 focus:ring-burmese-ruby"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-4 py-2 text-body-sm font-medium text-white bg-burmese-ruby rounded-md hover:bg-burmese-ruby/90 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlInput('');
                }}
                className="px-4 py-2 text-body-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        /* Image Preview */
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <img
              src={value}
              alt="Product preview"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-lg"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {uploadState === 'success' && (
            <div className="flex items-center gap-2 mt-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-body-sm">Image uploaded successfully</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-body-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
