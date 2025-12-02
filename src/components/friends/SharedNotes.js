import React, { useState, useEffect } from 'react';
import sharedService from '../../services/sharedService';
import './SharedContent.css';

const SharedNotes = ({ friendId, token }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteContent, setNoteContent] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [friendId, token]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await sharedService.getSharedNotes(token, friendId);
      setNotes(data.notes || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!noteContent.title.trim()) return;

    try {
      setSaving(true);
      const data = await sharedService.createNote(token, friendId, noteContent);
      setNotes(prev => [data.note, ...prev]);
      setShowEditor(false);
      setNoteContent({ title: '', content: '' });
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !noteContent.title.trim()) return;

    try {
      setSaving(true);
      await sharedService.updateNote(token, editingNote.id, noteContent);
      setNotes(prev => prev.map(n => 
        n.id === editingNote.id ? { ...n, ...noteContent, updated_at: new Date().toISOString() } : n
      ));
      setEditingNote(null);
      setNoteContent({ title: '', content: '' });
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      await sharedService.deleteNote(token, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="shared-loading">
        <div className="loading-spinner"></div>
        <p>Loading shared notes...</p>
      </div>
    );
  }

  return (
    <div className="shared-notes">
      <div className="shared-header">
        <h3>📝 Shared Notes</h3>
        <button 
          className="add-btn"
          onClick={() => {
            setShowEditor(true);
            setEditingNote(null);
            setNoteContent({ title: '', content: '' });
          }}
        >
          + New Note
        </button>
      </div>

      {notes.length === 0 && !showEditor ? (
        <div className="shared-empty">
          <span className="empty-icon">📝</span>
          <p>No shared notes yet</p>
          <p className="hint">Create a note to share trading insights with your friend!</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-header">
                <h4>{note.title}</h4>
                <div className="note-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => {
                      setEditingNote(note);
                      setNoteContent({ title: note.title, content: note.content });
                      setShowEditor(true);
                    }}
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="note-content">{note.content}</div>
              <div className="note-meta">
                Updated {formatDate(note.updated_at || note.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Editor Modal */}
      {showEditor && (
        <div className="editor-modal" onClick={() => setShowEditor(false)}>
          <div className="editor-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowEditor(false)}>×</button>
            <h3>{editingNote ? 'Edit Note' : 'New Shared Note'}</h3>
            
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={noteContent.title}
                onChange={(e) => setNoteContent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
              />
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea
                value={noteContent.content}
                onChange={(e) => setNoteContent(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your trading insights, strategies, or analysis..."
                rows={8}
              />
            </div>

            <button 
              className="save-btn"
              onClick={editingNote ? handleUpdateNote : handleCreateNote}
              disabled={saving || !noteContent.title.trim()}
            >
              {saving ? 'Saving...' : editingNote ? 'Update Note' : 'Create Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedNotes;
