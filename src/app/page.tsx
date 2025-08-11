import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-coral via-coral/90 to-coral-accent py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Where Pets Find Their 
                <span className="block text-beige">Forever Families</span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                Join thousands of loving families who have found their perfect companions through 
                our trusted pet adoption platform. Every pet deserves a loving home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/pets">
                  <Button size="lg" className="bg-white text-coral hover:bg-beige border-2 border-white">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Find Your Pet
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="secondary" size="lg" className="border-2 border-white text-white hover:bg-white hover:text-coral">
                    Join Community
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-6 text-center text-white">
                  <div>
                    <div className="text-3xl font-bold mb-2">2,500+</div>
                    <div className="text-white/80">Pets Adopted</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-2">5,000+</div>
                    <div className="text-white/80">Happy Families</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-2">150+</div>
                    <div className="text-white/80">Partner Shelters</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-2">24/7</div>
                    <div className="text-white/80">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Pets Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-midnight mb-4">
            Meet Our Featured Pets
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            These adorable companions are waiting for their forever homes. 
            Could one of them be your perfect match?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Featured Pet Cards */}
          {[
            { name: 'Luna', type: 'Golden Retriever', age: '2 years', description: 'Friendly and energetic, loves playing fetch and meeting new people.' },
            { name: 'Whiskers', type: 'Maine Coon Cat', age: '1 year', description: 'Gentle giant with a calm personality, perfect for families with children.' },
            { name: 'Max', type: 'German Shepherd Mix', age: '3 years', description: 'Loyal and protective, would make an excellent companion for active families.' },
          ].map((pet, index) => (
            <Card key={index} variant="hoverable" className="group">
              <div className="aspect-square bg-gradient-to-br from-teal-bg to-coral-bg rounded-lg mb-4 flex items-center justify-center">
                <svg className="w-16 h-16 text-coral group-hover:text-teal transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <CardHeader>
                <CardTitle level={3} className="flex items-center justify-between">
                  <span>{pet.name}</span>
                  <span className="text-sm text-text-tertiary font-normal">{pet.age}</span>
                </CardTitle>
                <p className="text-teal font-medium">{pet.type}</p>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary text-sm">{pet.description}</p>
              </CardContent>
              <CardActions>
                <Button variant="adoption" size="sm" className="w-full">
                  Learn More
                </Button>
              </CardActions>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/pets">
            <Button variant="secondary" size="lg">
              View All Available Pets
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-midnight mb-4">
              Complete Pet Care Services
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Beyond adoption, we provide comprehensive services to ensure your pet&apos;s 
              health, happiness, and well-being throughout their life.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                ),
                title: 'Veterinary Care',
                description: 'Complete health checkups, vaccinations, and emergency care with certified veterinarians.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'Pet Training',
                description: 'Professional training programs for obedience, socialization, and behavioral development.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                title: 'Pet Boarding',
                description: 'Safe and comfortable boarding facilities with 24/7 care when you&apos;re away.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: 'Grooming',
                description: 'Professional grooming services to keep your pets looking and feeling their best.',
              },
            ].map((service, index) => (
              <Card key={index} variant="hoverable" className="text-center group">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-teal-bg text-teal rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-teal group-hover:text-white transition-colors">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-midnight mb-3">{service.title}</h3>
                  <p className="text-text-secondary text-sm">{service.description}</p>
                </CardContent>
                <CardActions>
                  <Button variant="service" size="sm" className="w-full">
                    Learn More
                  </Button>
                </CardActions>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/services">
              <Button variant="service" size="lg">
                Explore All Services
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-midnight mb-4">
            Join Our Caring Community
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Connect with fellow pet lovers, share experiences, and participate in events 
            that make a difference in the lives of pets and families.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-coral/10 text-coral rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-midnight mb-2">Community Forum</h3>
                  <p className="text-text-secondary">Share stories, ask questions, and get advice from experienced pet owners and professionals.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-coral/10 text-coral rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-midnight mb-2">Local Events</h3>
                  <p className="text-text-secondary">Join adoption drives, training workshops, and community gatherings in your area.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-coral/10 text-coral rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-midnight mb-2">Volunteer Opportunities</h3>
                  <p className="text-text-secondary">Make a direct impact by volunteering at shelters, fostering pets, or helping with events.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-bg to-coral-bg rounded-2xl p-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-midnight mb-4">Ready to Get Started?</h3>
              <p className="text-text-secondary mb-6">Join thousands of pet lovers making a difference in their communities.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/auth/register">
                  <Button variant="adoption" className="w-full">
                    Join Community
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="secondary" className="w-full">
                    View Events
                  </Button>
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex justify-center space-x-8 text-sm text-text-secondary">
                  <div className="text-center">
                    <div className="font-semibold text-coral text-lg">100+</div>
                    <div>Monthly Events</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-coral text-lg">500+</div>
                    <div>Active Volunteers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-midnight text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Every Pet Deserves a Loving Home
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Start your journey today. Whether you&apos;re looking to adopt, volunteer, or simply 
            connect with fellow pet lovers, Pet Love Community is here to support you every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pets">
              <Button size="lg" className="bg-coral hover:bg-coral-accent text-white border-2 border-coral">
                Find Your Perfect Pet
              </Button>
            </Link>
            <Link href="/volunteer">
              <Button variant="secondary" size="lg" className="border-2 border-white text-white hover:bg-white hover:text-midnight">
                Start Volunteering
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
