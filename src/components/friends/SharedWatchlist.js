import React, { useState, useEffect } from 'react';
import sharedService from '../../services/sharedService';
import './SharedContent.css';

const SharedWatchlist = ({ friendId, token }) => {
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [listData, setListData] = useState({ name: '', description: '', assets: [] });
  const [newAsset, setNewAsset] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWatchlists();
  }, [friendId, token]);

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      const data = await sharedService.getWatchlists(token, friendId);
      setWatchlists(data.watchlists || []);
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWatchlist = async () => {
    if (!listData.name.trim()) return;

    try {
      setSaving(true);
      const data = await sharedService.createWatchlist(token, friendId, listData);
      setWatchlists(prev => [data.watchlist, ...prev]);
      resetEditor();
    } catch (err) {
      console.error('Failed to create watchlist:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWatchlist = async () => {
    if (!editingList) return;

    try {
      setSaving(true);
      await sharedService.updateWatchlist(token, editingList.id, listData);
      setWatchlists(prev => prev.map(w => 
        w.id === editingList.id ? { ...w, ...listData, updated_at: new Date().toISOString() } : w
      ));
      resetEditor();
    } catch (err) {
      console.error('Failed to update watchlist:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWatchlist = async (watchlistId) => {
    if (!window.confirm('Delete this watchlist?')) return;

    try {
      await sharedService.deleteWatchlist(token, watchlistId);
      setWatchlists(prev => prev.filter(w => w.id !== watchlistId));
    } catch (err) {
      console.error('Failed to delete watchlist:', err);
    }
  };

  const handleAddAsset = () => {
    if (!newAsset.trim()) return;
    const asset = newAsset.toUpperCase().trim();
    if (!listData.assets.includes(asset)) {
      setListData(prev => ({ ...prev, assets: [...prev.assets, asset] }));
    }
    setNewAsset('');
  };

  const handleRemoveAsset = (asset) => {
    setListData(prev => ({
      ...prev,
      assets: prev.assets.filter(a => a !== asset)
    }));
  };

  const resetEditor = () => {
    setShowEditor(false);
    setEditingList(null);
    setListData({ name: '', description: '', assets: [] });
    setNewAsset('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="shared-loading">
        <div className="loading-spinner"></div>
        <p>Loading watchlists...</p>
      </div>
    );
  }

  return (
    <div className="shared-watchlist">
      <div className="shared-header">
        <h3>👀 Shared Watchlists</h3>
        <button 
          className="add-btn"
          onClick={() => {
            setShowEditor(true);
            setEditingList(null);
            setListData({ name: '', description: '', assets: [] });
          }}
        >
          + New Watchlist
        </button>
      </div>

      {watchlists.length === 0 && !showEditor ? (
        <div className="shared-empty">
          <span className="empty-icon">👀</span>
          <p>No shared watchlists yet</p>
          <p className="hint">Create a watchlist to track assets together!</p>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlists.map(watchlist => (
            <div key={watchlist.id} className="watchlist-card">
              <div className="watchlist-header">
                <h4>{watchlist.name}</h4>
                <div className="watchlist-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => {
                      setEditingList(watchlist);
                      setListData({
                        name: watchlist.name,
                        description: watchlist.description || '',
                        assets: watchlist.assets || []
                      });
                      setShowEditor(true);
                    }}
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteWatchlist(watchlist.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {watchlist.description && (
                <p className="watchlist-description">{watchlist.description}</p>
              )}
              <div className="watchlist-assets">
                {(watchlist.assets || []).map(asset => (
                  <span key={asset} className="asset-tag">{asset}</span>
                ))}
                {(!watchlist.assets || watchlist.assets.length === 0) && (
                  <span className="no-assets">No assets added</span>
                )}
              </div>
              <div className="watchlist-meta">
                Updated {formatDate(watchlist.updated_at || watchlist.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Watchlist Editor Modal */}
      {showEditor && (
        <div className="editor-modal" onClick={resetEditor}>
          <div className="editor-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={resetEditor}>×</button>
            <h3>{editingList ? 'Edit Watchlist' : 'New Shared Watchlist'}</h3>
            
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={listData.name}
                onChange={(e) => setListData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Forex Majors"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={listData.description}
                onChange={(e) => setListData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What's this watchlist for?"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Assets</label>
              <div className="asset-input-row">
                <input
                  type="text"
                  value={newAsset}
                  onChange={(e) => setNewAsset(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAsset()}
                  placeholder="e.g., EURUSD, BTC, AAPL"
                />
                <button className="add-asset-btn" onClick={handleAddAsset}>+</button>
              </div>
              <div className="asset-tags">
                {listData.assets.map(asset => (
                  <span key={asset} className="asset-tag">
                    {asset}
                    <button onClick={() => handleRemoveAsset(asset)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <button 
              className="save-btn"
              onClick={editingList ? handleUpdateWatchlist : handleCreateWatchlist}
              disabled={saving || !listData.name.trim()}
            >
              {saving ? 'Saving...' : editingList ? 'Update Watchlist' : 'Create Watchlist'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedWatchlist;
