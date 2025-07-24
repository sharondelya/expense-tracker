import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

const SplitGroupModal = ({ onClose, onSuccess, editGroup = null }) => {
  const { theme } = useTheme();
  const [name, setName] = useState(editGroup?.name || '');
  const [description, setDescription] = useState(editGroup?.description || '');
  const [members, setMembers] = useState(editGroup?.members || [{ name: '', email: '' }]);
  const [loading, setLoading] = useState(false);

  const addMember = () => {
    setMembers([...members, { name: '', email: '' }]);
  };

  const removeMember = (index) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index, field, value) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (members.some(m => !m.name.trim() || !m.email.trim())) {
      toast.error('Please fill in all member details');
      return;
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (members.some(m => !emailRegex.test(m.email))) {
      toast.error('Please enter valid email addresses');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editGroup ? `/api/splits/groups/${editGroup.id}` : '/api/splits/groups';
      const method = editGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          members: members.map(m => ({
            name: m.name.trim(),
            email: m.email.trim().toLowerCase()
          }))
        })
      });

      if (response.ok) {
        toast.success(`Split group ${editGroup ? 'updated' : 'created'} successfully!`);
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${editGroup ? 'update' : 'create'} group`);
      }
    } catch (error) {
      console.error(`Error ${editGroup ? 'updating' : 'creating'} group:`, error);
      toast.error(`Failed to ${editGroup ? 'update' : 'create'} group`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editGroup ? 'Edit Split Group' : 'Create Split Group'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Roommates, Trip to Paris, Office Lunch"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of what this group is for..."
              />
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group Members *
                </label>
                <button
                  type="button"
                  onClick={addMember}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Plus className="w-4 h-4" />
                  Add Member
                </button>
              </div>

              <div className="space-y-3">
                {members.map((member, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Member name"
                        value={member.name}
                        onChange={(e) => updateMember(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="member@example.com"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      disabled={members.length === 1}
                      className="p-2 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className={`mt-3 p-3 rounded-lg ${
                theme === 'dark' ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-50'
              }`}>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Note:</p>
                    <p>You will be automatically added as the group creator. Only add other members here.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Preview */}
            <div className={`p-4 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Group Preview</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total members:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {members.length + 1} (including you)
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  <span>Members: </span>
                  <span className="font-medium">You</span>
                  {members.filter(m => m.name.trim()).map((member, index) => (
                    <span key={index}>, {member.name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating Group...' : 'Create Group'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SplitGroupModal;