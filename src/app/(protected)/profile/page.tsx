'use client';

import { ProtectedRoute } from '@/components/enterprise/ProtectedRoute';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { correlationService } from '@/lib/services/CorrelationService';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  return (
    <ProtectedRoute requiredRole="user">
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user } = usePetLoveCommunitySession();
  const [correlationId, setCorrelationId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    interests: [],
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
  });

  useEffect(() => {
    const correlationContext = correlationService.createContext(user?.id, undefined);
    setCorrelationId(correlationContext.correlationId);

    console.log('[Profile] User profile accessed', {
      correlationId: correlationContext.correlationId,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
    });

    // Initialize form data with user information
    if (user) {
      const [firstName, ...lastNameParts] = (user.name || '').split(' ');
      setFormData({
        firstName: firstName || '',
        lastName: lastNameParts.join(' ') || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        bio: user.bio || '',
        interests: [],
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.startsWith('notifications.')) {
      const notificationField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationField]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = () => {
    console.log('[Profile] Save profile changes', {
      correlationId,
      userId: user?.id,
      changes: formData,
      timestamp: new Date().toISOString(),
    });
    
    // TODO: Implement profile update API call
    setIsEditing(false);
  };

  const roleOptions = [
    { value: 'user', label: 'Pet Lover' },
    { value: 'volunteer', label: 'Volunteer' },
  ];

  const accountStats = [
    {
      title: 'Member Since',
      value: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : 'N/A',
      subtitle: 'Year joined',
      icon: '📅',
    },
    {
      title: 'Adoption Applications',
      value: user?.adoptionHistory?.length || 0,
      subtitle: 'Applications submitted',
      icon: '❤️',
    },
    {
      title: 'Events Attended',
      value: user?.volunteeredEvents?.length || 0,
      subtitle: 'Community events',
      icon: '🎉',
    },
    {
      title: 'Profile Complete',
      value: '85%',
      subtitle: 'Add more info',
      icon: '📝',
    },
  ];

  return (
    <div className="min-h-[80vh] px-4 sm:px-6 lg:px-8 py-8" data-correlation-id={correlationId}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-midnight mb-2">My Profile</h1>
          <p className="text-text-secondary">
            Manage your account information and preferences
          </p>
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {accountStats.map((stat, index) => (
            <Card key={index} variant="default" className="text-center">
              <CardContent className="p-6">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <p className="text-2xl font-bold text-midnight">{stat.value}</p>
                <p className="text-sm font-medium text-text-secondary">{stat.title}</p>
                <p className="text-xs text-text-tertiary">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Form */}
          <div className="lg:col-span-2">
            <Card variant="default">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle level={2} className="text-xl text-midnight">
                  Personal Information
                </CardTitle>
                <Button
                  variant={isEditing ? "adoption" : "outline"}
                  size="sm"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                >
                  {isEditing ? '💾 Save Changes' : '✏️ Edit Profile'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="First Name"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={(value) => handleInputChange('firstName', value)}
                    disabled={!isEditing}
                  />
                  <Input
                    type="text"
                    label="Last Name"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={(value) => handleInputChange('lastName', value)}
                    disabled={!isEditing}
                  />
                </div>

                <Input
                  type="email"
                  label="Email Address"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(value) => handleInputChange('email', value)}
                  disabled={!isEditing}
                  hint="This is used for important notifications"
                />

                <Input
                  type="tel"
                  label="Phone Number"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  disabled={!isEditing}
                  hint="Optional - for adoption coordinators to contact you"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-midnight">
                    About Me
                  </label>
                  <textarea
                    className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-coral focus:border-coral transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                    rows={4}
                    placeholder="Tell us about yourself, your experience with pets, and what you're looking for..."
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                  />
                  <p className="text-xs text-text-tertiary">
                    This helps adoption coordinators match you with the right pet
                  </p>
                </div>

                {/* Account Settings */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-midnight mb-4">Account Settings</h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-midnight">Email Notifications</p>
                        <p className="text-xs text-text-secondary">Receive updates about pets and events</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.email}
                          onChange={(e) => handleInputChange('notifications.email', e.target.checked)}
                          disabled={!isEditing}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coral/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-midnight">SMS Notifications</p>
                        <p className="text-xs text-text-secondary">Get text alerts for urgent updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.sms}
                          onChange={(e) => handleInputChange('notifications.sms', e.target.checked)}
                          disabled={!isEditing}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coral/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-midnight">Push Notifications</p>
                        <p className="text-xs text-text-secondary">Browser notifications for new messages</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.notifications.push}
                          onChange={(e) => handleInputChange('notifications.push', e.target.checked)}
                          disabled={!isEditing}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coral/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Email Verified</span>
                  <span className={`text-sm font-medium ${user?.isEmailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                    {user?.isEmailVerified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Account Type</span>
                  <span className="text-sm font-medium text-midnight capitalize">{user?.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Status</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
                
                {!user?.isEmailVerified && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log('Resend verification clicked', { correlationId, userId: user?.id })}
                      className="w-full"
                    >
                      Resend Verification Email
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Change password clicked', { correlationId, userId: user?.id })}
                  className="w-full text-left justify-start"
                >
                  🔒 Change Password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Download data clicked', { correlationId, userId: user?.id })}
                  className="w-full text-left justify-start"
                >
                  📥 Download My Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Privacy settings clicked', { correlationId, userId: user?.id })}
                  className="w-full text-left justify-start"
                >
                  🛡️ Privacy Settings
                </Button>
              </CardContent>
            </Card>

            {/* Support */}
            <Card variant="default">
              <CardHeader>
                <CardTitle level={3} className="text-lg text-midnight">
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Contact our support team if you need assistance with your account.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => console.log('Contact support clicked', { correlationId, userId: user?.id })}
                  className="w-full"
                >
                  💬 Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}