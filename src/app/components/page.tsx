'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Select } from '@/components/forms/Select';
import { Breadcrumb, Tabs } from '@/components/ui/Navigation';

export default function ComponentShowcase() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    service: ''
  });

  const breadcrumbItems = [
    { href: '/', label: 'Home', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { label: 'Components' }
  ];

  const tabItems = [
    { 
      id: 'buttons', 
      label: 'Buttons', 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      )
    },
    { 
      id: 'cards', 
      label: 'Cards',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      id: 'forms', 
      label: 'Forms',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'navigation', 
      label: 'Navigation',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="text-center">
          <h1 className="text-4xl font-bold text-midnight mb-4">
            Pet Love Community Design System
          </h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Explore our comprehensive component library built with enterprise reliability, 
            accessibility, and Pet Love Community brand standards in mind.
          </p>
        </div>
      </div>

      {/* Component Tabs */}
      <Tabs 
        items={tabItems.map(tab => ({
          ...tab,
          content: (
            <div className="mt-8">
              {tab.id === 'buttons' && <ButtonShowcase />}
              {tab.id === 'cards' && <CardShowcase />}
              {tab.id === 'forms' && <FormShowcase formData={formData} onInputChange={handleInputChange} />}
              {tab.id === 'navigation' && <NavigationShowcase />}
            </div>
          )
        }))}
        defaultActive="buttons"
        variant="pills"
        className="bg-white rounded-lg shadow-sm p-6"
      />
    </div>
  );
}

// Button Showcase Component
function ButtonShowcase() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold text-midnight mb-6">Button Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Adoption Buttons */}
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Adoption (Coral)</CardTitle>
              <p className="text-text-secondary">For pet adoption actions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="adoption" size="sm">Small Adoption</Button>
              <Button variant="adoption" size="md">Medium Adoption</Button>
              <Button variant="adoption" size="lg">Large Adoption</Button>
              <Button variant="adoption" disabled>Disabled</Button>
            </CardContent>
          </Card>

          {/* Service Buttons */}
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Service (Teal)</CardTitle>
              <p className="text-text-secondary">For service-related actions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="service" size="sm">Small Service</Button>
              <Button variant="service" size="md">Medium Service</Button>
              <Button variant="service" size="lg">Large Service</Button>
              <Button variant="service" disabled>Disabled</Button>
            </CardContent>
          </Card>

          {/* Secondary Buttons */}
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Secondary</CardTitle>
              <p className="text-text-secondary">For secondary actions</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="secondary" size="sm">Small Secondary</Button>
              <Button variant="secondary" size="md">Medium Secondary</Button>
              <Button variant="secondary" size="lg">Large Secondary</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-midnight mb-6">Button States & Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Loading States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="adoption" loading>
                Processing Adoption
              </Button>
              <Button variant="service" loading>
                Booking Service
              </Button>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>With Icons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="adoption">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Adopt Pet
              </Button>
              <Button variant="service">
                Book Service
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// Card Showcase Component
function CardShowcase() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold text-midnight mb-6">Card Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Default Card</CardTitle>
              <p className="text-text-secondary">Standard card with subtle shadow</p>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">This is a default card variant with standard styling and spacing.</p>
            </CardContent>
            <CardActions>
              <Button variant="secondary" size="sm">Action</Button>
            </CardActions>
          </Card>

          <Card variant="hoverable">
            <CardHeader>
              <CardTitle level={3}>Hoverable Card</CardTitle>
              <p className="text-text-secondary">Interactive with hover effects</p>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">Hover over this card to see the interactive effects and elevation changes.</p>
            </CardContent>
            <CardActions>
              <Button variant="adoption" size="sm">Hover Me</Button>
            </CardActions>
          </Card>

          <Card variant="clickable" onClick={() => alert('Card clicked!')}>
            <CardHeader>
              <CardTitle level={3}>Clickable Card</CardTitle>
              <p className="text-text-secondary">Entire card is clickable</p>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">Click anywhere on this card to trigger an action.</p>
            </CardContent>
            <CardActions>
              <span className="text-sm text-text-tertiary">Click anywhere</span>
            </CardActions>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-midnight mb-6">Pet Profile Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'Bella', breed: 'Golden Retriever', age: '2 years', status: 'Available' },
            { name: 'Oscar', breed: 'Maine Coon', age: '1 year', status: 'Adopted' },
            { name: 'Rex', breed: 'German Shepherd', age: '3 years', status: 'Pending' },
          ].map((pet, index) => (
            <Card key={index} variant="hoverable" className="group">
              <div className="aspect-square bg-gradient-to-br from-coral-bg to-teal-bg rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-16 h-16 text-coral group-hover:text-teal transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <CardHeader>
                <CardTitle level={3} className="flex justify-between items-center">
                  <span>{pet.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pet.status === 'Available' ? 'bg-coral text-white' :
                    pet.status === 'Adopted' ? 'bg-teal text-white' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {pet.status}
                  </span>
                </CardTitle>
                <p className="text-teal font-medium">{pet.breed} • {pet.age}</p>
              </CardHeader>
              <CardActions>
                <Button 
                  variant={pet.status === 'Available' ? 'adoption' : 'secondary'} 
                  size="sm" 
                  className="w-full"
                  disabled={pet.status === 'Adopted'}
                >
                  {pet.status === 'Available' ? 'Adopt Me' : 
                   pet.status === 'Adopted' ? 'Adopted' : 'Learn More'}
                </Button>
              </CardActions>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

// Form Showcase Component
interface FormShowcaseProps {
  formData: {
    name: string;
    email: string;
    message: string;
    service: string;
  };
  onInputChange: (field: string, value: string) => void;
}

function FormShowcase({ formData, onInputChange }: FormShowcaseProps) {
  const serviceOptions = [
    { value: '', label: 'Select a service...' },
    { value: 'veterinary', label: 'Veterinary Care' },
    { value: 'training', label: 'Pet Training' },
    { value: 'boarding', label: 'Pet Boarding' },
    { value: 'grooming', label: 'Pet Grooming' }
  ];

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold text-midnight mb-6">Form Components</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Inputs */}
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Input Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(value) => onInputChange('name', value)}
                required
              />
              
              <Input
                type="email"
                label="Email Address"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(value) => onInputChange('email', value)}
                required
                helpText="We'll never share your email address"
              />
              
              <Input
                label="Disabled Input"
                placeholder="This input is disabled"
                disabled
                value="Disabled value"
              />
              
              <Input
                label="Error State"
                placeholder="This has an error"
                error="This field contains an error"
                value="Invalid input"
              />
            </CardContent>
          </Card>

          {/* Form Controls */}
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Advanced Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select
                label="Service Type"
                options={serviceOptions}
                value={formData.service}
                onChange={(value) => onInputChange('service', value)}
                required
              />
              
              <Textarea
                label="Message"
                placeholder="Tell us more about your pet care needs..."
                value={formData.message}
                onChange={(value) => onInputChange('message', value)}
                rows={4}
                helpText="Minimum 10 characters required"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibent text-midnight mb-6">Complete Form Example</h2>
        <Card variant="default" className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle level={3}>Pet Service Inquiry</CardTitle>
            <p className="text-text-secondary">Get in touch with our pet care specialists</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Your Name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(value) => onInputChange('name', value)}
                required
              />
              <Input
                type="email"
                label="Email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(value) => onInputChange('email', value)}
                required
              />
            </div>
            
            <Select
              label="Service of Interest"
              options={serviceOptions}
              value={formData.service}
              onChange={(value) => onInputChange('service', value)}
              required
            />
            
            <Textarea
              label="Additional Information"
              placeholder="Tell us about your pet and specific needs..."
              value={formData.message}
              onChange={(value) => onInputChange('message', value)}
              rows={4}
            />
          </CardContent>
          <CardActions alignment="right">
            <Button variant="secondary" size="md">
              Cancel
            </Button>
            <Button variant="service" size="md">
              Submit Inquiry
            </Button>
          </CardActions>
        </Card>
      </section>
    </div>
  );
}

// Navigation Showcase Component
function NavigationShowcase() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold text-midnight mb-6">Navigation Components</h2>
        
        <div className="space-y-8">
          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Breadcrumb Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Breadcrumb 
                items={[
                  { href: '/', label: 'Home' },
                  { href: '/pets', label: 'Pets' },
                  { href: '/pets/dogs', label: 'Dogs' },
                  { label: 'Golden Retriever' }
                ]} 
              />
              
              <Breadcrumb 
                items={[
                  { href: '/', label: 'Home', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )},
                  { href: '/services', label: 'Services', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )},
                  { label: 'Veterinary Care' }
                ]} 
              />
            </CardContent>
          </Card>

          <Card variant="default">
            <CardHeader>
              <CardTitle level={3}>Tab Variations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <h4 className="font-medium mb-4">Default Tabs</h4>
                  <Tabs 
                    items={[
                      { id: 'overview', label: 'Overview', content: <div className="p-4 bg-coral-bg rounded">Overview content here</div> },
                      { id: 'details', label: 'Details', content: <div className="p-4 bg-teal-bg rounded">Details content here</div> },
                      { id: 'reviews', label: 'Reviews', badge: '12', content: <div className="p-4 bg-beige rounded">Reviews content here</div> }
                    ]}
                    variant="default"
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-4">Pill Tabs</h4>
                  <Tabs 
                    items={[
                      { id: 'pets', label: 'My Pets', content: <div className="p-4 bg-coral-bg rounded">My pets content</div> },
                      { id: 'services', label: 'Services', content: <div className="p-4 bg-teal-bg rounded">Services content</div> },
                      { id: 'appointments', label: 'Appointments', badge: '3', content: <div className="p-4 bg-beige rounded">Appointments content</div> }
                    ]}
                    variant="pills"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}