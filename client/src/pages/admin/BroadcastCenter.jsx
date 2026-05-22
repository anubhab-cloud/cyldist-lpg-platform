import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { notificationsAPI } from '../../api';

function BroadcastCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    target: 'customers',
    customPhone: '',
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (formData.message.trim().length < 5) {
      toast('Invalid Message', 'Message must be at least 5 characters', 'error');
      return;
    }
    
    if (formData.target === 'custom' && !formData.customPhone) {
      toast('Missing Details', 'Please provide a specific phone number', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await notificationsAPI.broadcast(formData);
      toast('Broadcast Sent', res.data.message || 'Message broadcast started!', 'success');
      setFormData((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      toast('Broadcast Failed', err.response?.data?.message || 'Failed to send broadcast', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Broadcast Center</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <form onSubmit={handleSend} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Audience
            </label>
            <select
              name="target"
              value={formData.target}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="customers">All Customers</option>
              <option value="agents">All Delivery Agents</option>
              <option value="all">Everyone (Customers & Agents)</option>
              <option value="custom">Specific User / Phone Number</option>
            </select>
          </div>

          {formData.target === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (with Country Code)
              </label>
              <input
                type="text"
                name="customPhone"
                value={formData.customPhone}
                onChange={handleChange}
                placeholder="e.g. +919876543210"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message Content (SMS)
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="5"
              placeholder="Type your promotional offer, invoice link, or announcement here..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              This message will be sent via SMS to the selected audience. Standard carrier charges may apply depending on your provider.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Broadcast</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BroadcastCenter;
