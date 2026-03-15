// ============================================
// Contacts Page - Emergency Contact Management
// ============================================

import { useState, useEffect } from 'react';
import {
  UserPlus, Edit3, Trash2, Phone, X, Check,
  Users, Heart, Briefcase, User, Shield
} from 'lucide-react';
import { getContacts, addContact, updateContact, deleteContact } from '../../utils/storage';
import './Contacts.css';

const RELATIONSHIPS = [
  { value: 'Family', icon: Heart, color: '#ff2d55' },
  { value: 'Friend', icon: Users, color: '#64d2ff' },
  { value: 'Work', icon: Briefcase, color: '#ff9f0a' },
  { value: 'Other', icon: User, color: '#bf5af2' },
];

export default function Contacts({ showToast }) {
  const [contacts, setContacts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', relationship: 'Family' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Name and phone number are required.', 'error');
      return;
    }

    if (editingContact) {
      updateContact(editingContact.id, formData);
      showToast('Contact updated successfully!', 'success');
    } else {
      addContact(formData);
      showToast('Contact added successfully!', 'success');
    }

    setContacts(getContacts());
    closeForm();
  };

  const handleDelete = (id) => {
    deleteContact(id);
    setContacts(getContacts());
    setDeleteConfirm(null);
    showToast('Contact removed.', 'info');
  };

  const openEditForm = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingContact(null);
    setFormData({ name: '', phone: '', relationship: 'Family' });
  };

  const getRelationshipDetails = (rel) => {
    return RELATIONSHIPS.find(r => r.value === rel) || RELATIONSHIPS[3];
  };

  return (
    <div className="contacts" id="contacts-page">
      {/* Header */}
      <div className="contacts__header">
        <div className="contacts__header-top">
          <div>
            <h1 className="contacts__title">Emergency Contacts</h1>
            <p className="contacts__subtitle">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            className="contacts__add-btn"
            onClick={() => setIsFormOpen(true)}
            id="add-contact-btn"
            aria-label="Add contact"
          >
            <UserPlus size={20} />
          </button>
        </div>

        {contacts.length === 0 && (
          <div className="contacts__empty glass animate-fade-in">
            <Shield size={40} className="contacts__empty-icon" />
            <h3>No Contacts Yet</h3>
            <p>Add trusted contacts who will receive your emergency alerts.</p>
            <button
              className="contacts__empty-btn"
              onClick={() => setIsFormOpen(true)}
            >
              <UserPlus size={16} />
              Add First Contact
            </button>
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="contacts__list">
        {contacts.map((contact, index) => {
          const rel = getRelationshipDetails(contact.relationship);
          const RelIcon = rel.icon;
          return (
            <div
              key={contact.id}
              className="contacts__card glass animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="contacts__card-left">
                <div className="contacts__avatar" style={{ background: `${rel.color}20`, color: rel.color }}>
                  <RelIcon size={20} />
                </div>
                <div className="contacts__info">
                  <h3 className="contacts__name">{contact.name}</h3>
                  <p className="contacts__phone">{contact.phone}</p>
                  <span className="contacts__rel-badge" style={{ color: rel.color, borderColor: `${rel.color}40` }}>
                    {contact.relationship}
                  </span>
                </div>
              </div>

              <div className="contacts__card-actions">
                <a
                  href={`tel:${contact.phone}`}
                  className="contacts__action-btn contacts__action-btn--call"
                  aria-label={`Call ${contact.name}`}
                >
                  <Phone size={16} />
                </a>
                <button
                  className="contacts__action-btn contacts__action-btn--edit"
                  onClick={() => openEditForm(contact)}
                  aria-label={`Edit ${contact.name}`}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="contacts__action-btn contacts__action-btn--delete"
                  onClick={() => setDeleteConfirm(contact.id)}
                  aria-label={`Delete ${contact.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === contact.id && (
                <div className="contacts__delete-confirm">
                  <span>Remove this contact?</span>
                  <div className="contacts__delete-actions">
                    <button
                      className="contacts__delete-yes"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                    <button
                      className="contacts__delete-no"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="contacts__form">
              <div className="contacts__form-header">
                <h2>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
                <button className="contacts__form-close" onClick={closeForm}>
                  <X size={20} />
                </button>
              </div>

              <div className="contacts__form-body">
                <div className="contacts__field">
                  <label className="contacts__label">Full Name</label>
                  <input
                    type="text"
                    className="contacts__input"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    id="contact-name-input"
                    autoFocus
                  />
                </div>

                <div className="contacts__field">
                  <label className="contacts__label">Phone Number</label>
                  <input
                    type="tel"
                    className="contacts__input"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    id="contact-phone-input"
                  />
                </div>

                <div className="contacts__field">
                  <label className="contacts__label">Relationship</label>
                  <div className="contacts__rel-grid">
                    {RELATIONSHIPS.map((rel) => {
                      const Icon = rel.icon;
                      return (
                        <button
                          key={rel.value}
                          className={`contacts__rel-option ${formData.relationship === rel.value ? 'contacts__rel-option--active' : ''}`}
                          style={{
                            '--rel-color': rel.color,
                          }}
                          onClick={() => setFormData({ ...formData, relationship: rel.value })}
                        >
                          <Icon size={16} />
                          <span>{rel.value}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="contacts__form-footer">
                <button className="contacts__cancel-btn" onClick={closeForm}>
                  Cancel
                </button>
                <button className="contacts__save-btn" onClick={handleSubmit} id="save-contact-btn">
                  <Check size={16} />
                  {editingContact ? 'Update' : 'Save Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
