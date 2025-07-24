import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  X,
  Image,
  File,
  Camera,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';

const ReceiptUpload = ({ expenseId, onUploadSuccess, onClose }) => {
  const { theme } = useTheme();
  const { addNotification } = useNotifications();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      addNotification({
        type: 'error',
        message: 'Please select an image file'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      addNotification({
        type: 'error',
        message: 'File size must be less than 10MB'
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const uploadReceipt = async () => {
    if (!selectedFile) {
      addNotification({
        type: 'error',
        message: 'Please select a file first'
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('receipt', selectedFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receipts/upload/${expenseId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        addNotification({
          type: 'success',
          message: 'Receipt uploaded successfully'
        });
        onUploadSuccess && onUploadSuccess(data.receipt);
        onClose && onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      addNotification({
        type: 'error',
        message: error.message || 'Failed to upload receipt'
      });
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Receipt
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!selectedFile ? (
            /* Upload Area */
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <Upload className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Drop your receipt here
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    or click to browse files
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <Image className="w-4 h-4 mr-1" />
                    Images only
                  </div>
                  <div className="flex items-center">
                    <File className="w-4 h-4 mr-1" />
                    Max 10MB
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* File Preview */
            <div className="space-y-4">
              {/* Preview Image */}
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={clearSelection}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* File Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-48">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Upload Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Tips for better receipts:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Ensure the receipt is well-lit and clearly visible</li>
                  <li>• Include all important details (amount, date, merchant)</li>
                  <li>• Avoid shadows and reflections</li>
                  <li>• Keep the receipt flat and straight</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={uploadReceipt}
            disabled={!selectedFile || uploading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Receipt
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReceiptUpload;