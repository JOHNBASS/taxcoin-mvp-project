import { useState, useRef, useCallback } from 'react';

interface ReceiptUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

/**
 * 收據上傳組件
 * 支援拖曳、點擊上傳、相機拍照
 */
export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 5,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  /**
   * 驗證檔案
   */
  const validateFile = (file: File): string | null => {
    // 檢查檔案類型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return `不支援的檔案格式: ${file.type}`;
    }

    // 檢查檔案大小
    if (file.size > maxSizeBytes) {
      return `檔案過大: ${(file.size / 1024 / 1024).toFixed(2)}MB (最大 ${maxSizeMB}MB)`;
    }

    return null;
  };

  /**
   * 處理檔案選擇
   */
  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles || newFiles.length === 0) return;

      setError('');

      // 轉換為陣列
      const fileArray = Array.from(newFiles);

      // 檢查數量限制
      if (files.length + fileArray.length > maxFiles) {
        setError(`最多只能上傳 ${maxFiles} 張收據`);
        return;
      }

      // 驗證每個檔案
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        validFiles.push(file);

        // 生成預覽
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === validFiles.length) {
              setPreviews((prev) => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      }

      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
    },
    [files, maxFiles, maxSizeBytes, onFilesChange]
  );

  /**
   * 移除檔案
   */
  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onFilesChange(updatedFiles);
    setError('');
  };

  /**
   * 拖曳事件處理
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  /**
   * 點擊上傳
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* 上傳區域 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-300
          ${
            isDragging
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-gray-700 hover:border-gray-600 bg-dark-hover/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          capture="environment" // 手機相機
        />

        <div className="space-y-4">
          {/* 圖示 */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/20">
            <svg
              className="w-8 h-8 text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* 提示文字 */}
          <div>
            <p className="text-lg font-semibold text-white mb-1">
              {isDragging ? '放開以上傳' : '點擊或拖曳檔案到此處'}
            </p>
            <p className="text-sm text-gray-400">
              支援 JPG, PNG, WebP 格式,最大 {maxSizeMB}MB
            </p>
            <p className="text-sm text-gray-500 mt-2">
              📱 手機用戶可直接拍照上傳
            </p>
          </div>

          {/* 已選擇檔案數 */}
          {files.length > 0 && (
            <div className="text-sm text-primary-400">
              已選擇 {files.length} / {maxFiles} 張
            </div>
          )}
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 預覽區域 */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400">已上傳收據預覽:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border border-gray-700 hover:border-primary-500 transition-all"
              >
                {/* 預覽圖片 */}
                <img
                  src={preview}
                  alt={`收據 ${index + 1}`}
                  className="w-full h-32 object-cover"
                />

                {/* 檔案資訊 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white truncate">
                    {files[index].name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(files[index].size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* 移除按鈕 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="
                    absolute top-2 right-2 w-6 h-6 rounded-full
                    bg-red-500 hover:bg-red-600
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100
                    transition-opacity
                  "
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
