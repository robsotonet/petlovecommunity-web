import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card variant="default" className="max-w-2xl w-full text-center">
        <CardContent className="pt-12 pb-8">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="relative">
              {/* Large 404 */}
              <div className="text-8xl md:text-9xl font-bold text-coral/20 select-none">
                404
              </div>
              
              {/* Pet silhouette overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg 
                  className="w-32 h-32 md:w-40 md:h-40 text-coral/60" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>
          </div>

          <CardHeader className="pb-4">
            <CardTitle level={1} className="text-3xl md:text-4xl text-midnight mb-4">
              Oops! This Pet Has Wandered Off
            </CardTitle>
            <p className="text-xl text-text-secondary leading-relaxed">
              The page you&apos;re looking for seems to have gone on an adventure. 
              Let&apos;s help you find your way back to our loving community.
            </p>
          </CardHeader>

          {/* Helpful suggestions */}
          <div className="mb-8 text-left max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-midnight mb-4 text-center">
              Here&apos;s what you can do:
            </h3>
            <ul className="space-y-2 text-text-secondary">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-coral mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Check the URL for any typos
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-coral mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Go back to the previous page
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-coral mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Visit our homepage to start fresh
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-coral mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Browse our available pets for adoption
              </li>
            </ul>
          </div>
        </CardContent>

        <CardActions alignment="center" className="pb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/">
              <Button variant="adoption" size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return Home
              </Button>
            </Link>
            
            <Link href="/pets">
              <Button variant="secondary" size="lg">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Find Pets
              </Button>
            </Link>
          </div>
        </CardActions>

        {/* Additional helpful links */}
        <div className="border-t border-gray-200 pt-6 pb-4">
          <p className="text-sm text-text-tertiary mb-4">
            Need more help? Try these popular pages:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/services" className="text-teal hover:text-teal-accent transition-colors">
              Pet Services
            </Link>
            <Link href="/events" className="text-teal hover:text-teal-accent transition-colors">
              Community Events
            </Link>
            <Link href="/about" className="text-teal hover:text-teal-accent transition-colors">
              About Us
            </Link>
            <Link href="/contact" className="text-teal hover:text-teal-accent transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}