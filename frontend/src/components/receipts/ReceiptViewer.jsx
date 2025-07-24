import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Trash2,
  Eye,
  Calendar,
  FileText,
  Image,
  Loader,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';

const ReceiptViewer = ({ expenseId, onClose, onDelete }) => {
  const { theme } = useTheme();
  const { addNotification } = useNotifications();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    fetchReceipt();
    fetchImage();
  }, [expenseId]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receipts/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReceipt(data.receipt);
      } else if (response.status === 404) {
        addNotification({
          type: 'info',
          message: 'No receipt found for this expense'
        });
        onClose();
      } else {
        throw new Error('Failed to fetch receipt');
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      addNotification({
        type: 'error',
        message: 'Failed to load receipt'
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchImage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receipts/image/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } else {
        throw new Error('Failed to fetch image');
      }
    } catch (error) {
      console.error('Error fetching image:', error);
      addNotification({
        type: 'error',
        message: 'Failed to load receipt image'
      });
    }
  };

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receipts/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          message: 'Receipt deleted successfully'
        });
        onDelete && onDelete();
        onClose();
      } else {
        throw new Error('Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete receipt'
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receipts/image/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = receipt?.originalName || 'receipt.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      addNotification({
        type: 'error',
        message: 'Failed to download receipt'
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex items-center space-x-3">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-900 dark:text-white">Loading receipt...</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
    >
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Receipt Viewer
            </h2>
            {receipt && (
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {receipt.originalName}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(receipt.uploadedAt)}
                </div>
                <div>
                  {formatFileSize(receipt.size)}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Delete Receipt"
            >
              {deleting ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {receipt && imageUrl ? (
            <div className="relative max-w-full max-h-full overflow-auto">
              <img
                src={imageUrl}
                alt="Receipt"
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  addNotification({
                    type: 'error',
                    message: 'Failed to load receipt image'
                  });
                  setImageLoaded(false);
                }}
              />
              
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="text-center">
                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400">Loading image...</p>
                  </div>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="text-center">
              <Loader className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                Loading receipt...
              </p>
            </div>
          ) : (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                Receipt not available
              </p>
              <p className="text-gray-500 dark:text-gray-500">
                The receipt image could not be loaded
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {receipt && (
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <Image className="w-4 h-4 mr-1" />
                {receipt.mimeType}
              </div>
              <div>
                Size: {formatFileSize(receipt.size)}
              </div>
              <div>
                Uploaded: {formatDate(receipt.uploadedAt)}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ReceiptViewer;