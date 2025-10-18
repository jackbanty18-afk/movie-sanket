"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Send, Users, Eye, Edit, Trash2, TestTube, X, User } from "lucide-react";

type NotificationTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'general' | 'booking' | 'promotional' | 'system';
  variables: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

type NotificationCampaign = {
  id: string;
  name: string;
  templateId: string;
  userSegment: 'all' | 'active' | 'recent_bookers' | 'high_spenders' | 'inactive' | 'custom';
  scheduledAt?: string;
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};

export default function AdminNotificationsPage() {
  const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mdtalkies_profile_v1')||'null')?.email : undefined;
  
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns' | 'compose'>('templates');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    subject: '',
    content: '',
    type: 'general' as NotificationTemplate['type'],
    variables: [] as string[]
  });

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    templateId: '',
    userSegment: 'all' as NotificationCampaign['userSegment'],
    scheduledAt: '',
    variables: {} as Record<string, string>
  });

  // Custom user selection state
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; fullName: string; status: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; email: string; fullName: string }>>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [segmentPreview, setSegmentPreview] = useState<{
    userCount: number;
    users: Array<{ email: string; fullName: string; id: string }>;
  } | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/admin/notifications/templates', {
        headers: { 'x-user-email': email || '' }
      });
      const d = await r.json();
      if (r.ok) {
        setTemplates(d.templates || []);
      } else {
        setError(d.error || 'Failed to load templates');
      }
    } catch (error) {
      setError('Failed to load templates');
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/admin/notifications/campaigns', {
        headers: { 'x-user-email': email || '' }
      });
      const d = await r.json();
      if (r.ok) {
        setCampaigns(d.campaigns || []);
      } else {
        setError(d.error || 'Failed to load campaigns');
      }
    } catch (error) {
      setError('Failed to load campaigns');
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSegmentPreview = async (segment: string) => {
    try {
      const r = await fetch(`/api/admin/notifications/campaigns?segment=${segment}`, {
        headers: { 'x-user-email': email || '' }
      });
      const d = await r.json();
      if (r.ok) {
        setSegmentPreview(d);
      }
    } catch (error) {
      console.error('Error loading segment preview:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const r = await fetch('/api/admin/users', {
        headers: { 'x-user-email': email || '' }
      });
      const d = await r.json();
      if (r.ok) {
        setAllUsers(d.users || []);
      } else {
        setError(d.error || 'Failed to load users');
      }
    } catch (error) {
      setError('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadCampaigns();
  }, []);

  const saveTemplate = async () => {
    try {
      const method = templateForm.id ? 'PUT' : 'POST';
      const r = await fetch('/api/admin/notifications/templates', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': email || ''
        },
        body: JSON.stringify(templateForm)
      });
      
      const d = await r.json();
      if (r.ok) {
        await loadTemplates();
        setTemplateForm({ id: '', name: '', subject: '', content: '', type: 'general', variables: [] });
        alert(d.message);
      } else {
        alert(d.error);
      }
    } catch (error) {
      alert('Failed to save template');
    }
  };

  const sendTestNotification = async (templateId: string) => {
    try {
      const r = await fetch('/api/admin/notifications/campaigns', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': email || ''
        },
        body: JSON.stringify({
          action: 'test',
          templateId,
          variables: campaignForm.variables
        })
      });
      
      const d = await r.json();
      if (r.ok) {
        alert(d.message);
      } else {
        alert(d.error);
      }
    } catch (error) {
      alert('Failed to send test notification');
    }
  };

  const sendCampaign = async () => {
    try {
      let payload = { ...campaignForm };
      
      // If custom users are selected, use them instead of segment
      if (campaignForm.userSegment === 'custom' && selectedUsers.length > 0) {
        payload = {
          ...campaignForm,
          customUsers: selectedUsers
        };
      }
      
      const r = await fetch('/api/admin/notifications/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': email || ''
        },
        body: JSON.stringify(payload)
      });
      
      const d = await r.json();
      if (r.ok) {
        await loadCampaigns();
        setCampaignForm({ name: '', templateId: '', userSegment: 'all', scheduledAt: '', variables: {} });
        setSelectedUsers([]);
        setSegmentPreview(null);
        setShowUserSelector(false);
        alert(d.message);
      } else {
        alert(d.error);
      }
    } catch (error) {
      alert('Failed to send campaign');
    }
  };

  const editTemplate = (template: NotificationTemplate) => {
    setTemplateForm({
      id: template.id,
      name: template.name,
      subject: template.subject,
      content: template.content,
      type: template.type,
      variables: template.variables
    });
    setActiveTab('templates');
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const r = await fetch(`/api/admin/notifications/templates?id=${templateId}`, {
        method: 'DELETE',
        headers: { 'x-user-email': email || '' }
      });
      
      const d = await r.json();
      if (r.ok) {
        await loadTemplates();
        alert(d.message);
      } else {
        alert(d.error);
      }
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  useEffect(() => {
    if (campaignForm.userSegment && campaignForm.userSegment !== 'custom') {
      loadSegmentPreview(campaignForm.userSegment);
    } else if (campaignForm.userSegment === 'custom') {
      setSegmentPreview({
        userCount: selectedUsers.length,
        users: selectedUsers.slice(0, 10)
      });
    }
  }, [campaignForm.userSegment, selectedUsers]);

  const toggleUserSelection = (user: { id: string; email: string; fullName: string; status: string }) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, { id: user.id, email: user.email, fullName: user.fullName }]);
    }
  };

  const selectAllUsers = () => {
    const filteredUsers = allUsers.filter(user => 
      user.status === 'active' && 
      user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase())
    );
    setSelectedUsers(filteredUsers.map(u => ({ id: u.id, email: u.email, fullName: u.fullName })));
  };

  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  const openUserSelector = () => {
    setShowUserSelector(true);
    if (allUsers.length === 0) {
      loadAllUsers();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-400';
      case 'sending': return 'text-blue-400';
      case 'scheduled': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notification Management
          </h1>
          <a className="text-sm underline" href="/admin">Back to Admin</a>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-600/20 p-4 ring-1 ring-red-500/30">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-4">
            {(['templates', 'campaigns', 'compose'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab
                    ? 'bg-pink-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tab === 'templates' && 'Templates'}
                {tab === 'campaigns' && 'Campaigns'}
                {tab === 'compose' && 'Compose'}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Template Form */}
            <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-semibold mb-4">
                {templateForm.id ? 'Edit Template' : 'Create Template'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                    placeholder="Welcome Message"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={templateForm.type}
                    onChange={e => setTemplateForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                  >
                    <option value="general">General</option>
                    <option value="booking">Booking</option>
                    <option value="promotional">Promotional</option>
                    <option value="system">System</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={e => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                    placeholder="Welcome to MD Talkies, {{userName}}!"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={templateForm.content}
                    onChange={e => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                    placeholder="Hello {{userName}}, welcome to MD Talkies! We're excited to have you join our community..."
                  />
                </div>
                
                <div className="text-xs text-white/60">
                  Available variables: {'{'}userName{'}'} (user's name), plus any custom variables you define
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={saveTemplate}
                    className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-500"
                  >
                    {templateForm.id ? 'Update' : 'Create'} Template
                  </button>
                  
                  {templateForm.id && (
                    <button
                      onClick={() => setTemplateForm({ id: '', name: '', subject: '', content: '', type: 'general', variables: [] })}
                      className="px-4 py-2 rounded bg-gray-600 text-white text-sm hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Templates List */}
            <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-semibold mb-4">Templates ({templates.length})</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {templates.map(template => (
                  <div key={template.id} className="bg-white/5 rounded-md p-4 ring-1 ring-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-white/70">{template.subject}</div>
                        <div className="text-xs text-white/60 mt-1">
                          Type: {template.type} • Created: {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => sendTestNotification(template.id)}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title="Send Test"
                        >
                          <TestTube className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => editTemplate(template)}
                          className="p-1 text-yellow-400 hover:text-yellow-300"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    No templates created yet. Create your first template to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="max-w-2xl">
            <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
              <h2 className="text-lg font-semibold mb-4">Send Notification Campaign</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={e => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                    placeholder="New Movie Release Announcement"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Select Template</label>
                  <select
                    value={campaignForm.templateId}
                    onChange={e => setCampaignForm(prev => ({ ...prev, templateId: e.target.value }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                  >
                    <option value="">Choose a template...</option>
                    {templates.filter(t => t.isActive).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.type})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">User Segment</label>
                  <select
                    value={campaignForm.userSegment}
                    onChange={e => setCampaignForm(prev => ({ ...prev, userSegment: e.target.value as any }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                  >
                    <option value="all">All Active Users</option>
                    <option value="active">Recently Active (last 30 days)</option>
                    <option value="recent_bookers">Recent Bookers (last 30 days)</option>
                    <option value="high_spenders">High Spenders (₹1000+)</option>
                    <option value="inactive">Inactive Users (90+ days)</option>
                    <option value="custom">Custom Selection</option>
                  </select>
                  
                  {campaignForm.userSegment === 'custom' && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={openUserSelector}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-500 flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Select Users ({selectedUsers.length} selected)
                      </button>
                    </div>
                  )}
                  
                  {segmentPreview && (
                    <div className="mt-2 p-3 bg-blue-600/20 rounded-md">
                      <div className="text-sm">
                        <strong>{segmentPreview.userCount}</strong> users will receive this notification
                      </div>
                      {segmentPreview.users.length > 0 && (
                        <div className="text-xs text-white/70 mt-1">
                          Preview: {segmentPreview.users.slice(0, 3).map(u => u.fullName).join(', ')}
                          {segmentPreview.users.length > 3 && ` and ${segmentPreview.users.length - 3} more`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Schedule (Optional)</label>
                  <input
                    type="datetime-local"
                    value={campaignForm.scheduledAt}
                    onChange={e => setCampaignForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10"
                  />
                  <div className="text-xs text-white/60 mt-1">
                    Leave empty to send immediately
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={sendCampaign}
                    disabled={
                      !campaignForm.name || 
                      !campaignForm.templateId || 
                      (campaignForm.userSegment === 'custom' && selectedUsers.length === 0)
                    }
                    className="px-6 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {campaignForm.scheduledAt ? 'Schedule Campaign' : 'Send Now'}
                  </button>
                  
                  {campaignForm.userSegment === 'custom' && selectedUsers.length === 0 && (
                    <div className="text-xs text-red-400 mt-2">
                      Please select at least one user for custom notifications
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="rounded-md bg-white/5 p-6 ring-1 ring-white/10">
            <h2 className="text-lg font-semibold mb-4">Campaign History ({campaigns.length})</h2>
            
            <div className="space-y-3">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="bg-white/5 rounded-md p-4 ring-1 ring-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-white/70">
                        Segment: {campaign.userSegment} • Recipients: {campaign.recipientCount} • Sent: {campaign.sentCount}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/60 mt-1">
                        <span>Created: {new Date(campaign.createdAt).toLocaleString()}</span>
                        {campaign.sentAt && <span>Sent: {new Date(campaign.sentAt).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </div>
                  </div>
                </div>
              ))}
              
              {campaigns.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  No campaigns sent yet. Create your first campaign in the Compose tab.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* User Selection Modal */}
      {showUserSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col ring-1 ring-white/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Select Users for Notification</h3>
              <button
                onClick={() => setShowUserSelector(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search and Actions */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search users by name..."
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    className="w-full rounded-md bg-white/10 px-3 py-2 ring-1 ring-white/10 text-white placeholder-white/50"
                  />
                </div>
                <button
                  onClick={selectAllUsers}
                  className="px-4 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-500"
                >
                  Select All Filtered
                </button>
                <button
                  onClick={clearAllUsers}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-500"
                >
                  Clear All
                </button>
              </div>
              <div className="mt-3 text-sm text-white/70">
                {selectedUsers.length} users selected • {allUsers.filter(u => u.status === 'active').length} total active users
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsers ? (
                <div className="text-center py-8 text-white/60">
                  Loading users...
                </div>
              ) : (
                <div className="grid gap-2">
                  {allUsers
                    .filter(user => 
                      user.status === 'active' &&
                      (user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
                    )
                    .map(user => {
                      const isSelected = selectedUsers.some(u => u.id === user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user)}
                          className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-600/20 ring-1 ring-blue-500/40' 
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleUserSelection(user)}
                              className="rounded border-white/20 bg-white/10"
                              onClick={e => e.stopPropagation()}
                            />
                            <User className="h-4 w-4 text-white/60" />
                            <div>
                              <div className="font-medium text-white">{user.fullName}</div>
                              <div className="text-sm text-white/70">{user.email}</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            user.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                          }`}>
                            {user.status}
                          </div>
                        </div>
                      );
                    })
                  }
                  
                  {allUsers.filter(user => 
                    user.status === 'active' &&
                    (user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                     user.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <div className="text-center py-8 text-white/60">
                      No users found matching your search.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex items-center justify-between">
              <div className="text-sm text-white/70">
                {selectedUsers.length} users selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUserSelector(false)}
                  className="px-4 py-2 rounded-md bg-gray-600 text-white text-sm hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowUserSelector(false)}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-500"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
