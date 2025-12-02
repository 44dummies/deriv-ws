import React, { useState, useEffect } from 'react';
import portfolioService from '../../services/portfolioService';
import './Portfolio.css';

const UserPortfolio = ({ userId, token, isOwner = false }) => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    asset_type: 'screenshot',
    metadata: {}
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, [userId, token]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const data = await portfolioService.getPortfolio(token, userId);
      setPortfolio(data.portfolio || []);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store only metadata - file stays local
      setSelectedFile(file);
      setNewItem(prev => ({
        ...prev,
        metadata: {
          filename: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          stored_locally: true // Media NOT stored in cloud
        }
      }));
    }
  };

  const handleUpload = async () => {
    if (!newItem.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      setUploading(true);
      await portfolioService.addItem(token, {
        title: newItem.title,
        description: newItem.description,
        asset_type: newItem.asset_type,
        metadata: newItem.metadata
      });
      
      setShowUploadModal(false);
      setNewItem({ title: '', description: '', asset_type: 'screenshot', metadata: {} });
      setSelectedFile(null);
      loadPortfolio();
    } catch (err) {
      console.error('Failed to upload:', err);
      alert('Failed to add portfolio item');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this portfolio item?')) return;
    
    try {
      await portfolioService.deleteItem(token, itemId);
      setPortfolio(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAssetIcon = (type) => {
    switch (type) {
      case 'screenshot': return '📸';
      case 'video': return '🎥';
      case 'strategy': return '📊';
      case 'trade_history': return '📈';
      default: return '📁';
    }
  };

  if (loading) {
    return (
      <div className="portfolio-loading">
        <div className="loading-spinner"></div>
        <p>Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="user-portfolio">
      <div className="portfolio-header">
        <h3>📂 Portfolio</h3>
        {isOwner && (
          <button 
            className="add-item-btn"
            onClick={() => setShowUploadModal(true)}
          >
            + Add Item
          </button>
        )}
      </div>

      {portfolio.length === 0 ? (
        <div className="portfolio-empty">
          <span className="empty-icon">📂</span>
          <p>No portfolio items yet</p>
          {isOwner && (
            <p className="hint">Add screenshots, strategies, or trade highlights!</p>
          )}
        </div>
      ) : (
        <div className="portfolio-grid">
          {portfolio.map(item => (
            <div key={item.id} className="portfolio-item">
              <div className="item-icon">{getAssetIcon(item.asset_type)}</div>
              <div className="item-content">
                <h4>{item.title}</h4>
                {item.description && (
                  <p className="item-description">{item.description}</p>
                )}
                <div className="item-meta">
                  <span className="item-type">{item.asset_type}</span>
                  <span className="item-date">{formatDate(item.created_at)}</span>
                </div>
                {item.metadata?.stored_locally && (
                  <div className="local-badge">📱 Stored locally</div>
                )}
              </div>
              {isOwner && (
                <button 
                  className="delete-item-btn"
                  onClick={() => handleDelete(item.id)}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="upload-modal" onClick={() => setShowUploadModal(false)}>
          <div className="upload-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-btn" 
              onClick={() => setShowUploadModal(false)}
            >
              ×
            </button>
            <h3>Add Portfolio Item</h3>
            
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., My best trade this month"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your trade or strategy..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={newItem.asset_type}
                onChange={(e) => setNewItem(prev => ({ ...prev, asset_type: e.target.value }))}
              >
                <option value="screenshot">Screenshot</option>
                <option value="video">Video</option>
                <option value="strategy">Strategy</option>
                <option value="trade_history">Trade History</option>
              </select>
            </div>

            <div className="form-group">
              <label>Attach File (Stored locally only)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf"
                />
                {selectedFile && (
                  <div className="selected-file">
                    📎 {selectedFile.name}
                  </div>
                )}
              </div>
              <p className="file-hint">
                ⚠️ Files are stored on YOUR device only, not uploaded to our servers.
              </p>
            </div>

            <button 
              className="upload-btn"
              onClick={handleUpload}
              disabled={uploading || !newItem.title.trim()}
            >
              {uploading ? 'Adding...' : 'Add to Portfolio'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPortfolio;
