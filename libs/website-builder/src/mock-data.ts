import { Website, WebsiteTheme } from './types'

/**
 * Mock data for local development
 * This file contains sample website data that can be used when running without Supabase
 */

export const mockWebsite: Website = {
  id: 'mock-website-1',
  userId: 'mock-user-123',
  name: 'Bella\'s Bakery',
  domain: 'bellas-bakery.naviai.local',
  theme: {
    colorPalette: {
      primary: '#8B4513',
      secondary: '#D2691E',
      accent: '#FFD700',
      background: '#FFF8DC',
      surface: '#FFFFFF',
      text: '#333333'
    },
    font: {
      heading: 'Playfair Display',
      body: 'Open Sans'
    }
  },
  pages: [
    {
      id: 'page-1',
      slug: 'home',
      title: 'Welcome to Bella\'s Bakery',
      metaTitle: 'Bella\'s Bakery - Fresh Pastries & Artisan Bread | Your Local Bakery',
      metaDescription: 'Experience the finest artisan breads and pastries at Bella\'s Bakery. Fresh baked daily with love and tradition.',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Bakery',
        name: 'Bella\'s Bakery',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '123 Main Street',
          addressLocality: 'San Francisco',
          addressRegion: 'CA',
          postalCode: '94102',
          addressCountry: 'US'
        },
        telephone: '+1-555-0123',
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '07:00',
            closes: '18:00'
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: 'Saturday',
            opens: '08:00',
            closes: '17:00'
          }
        ]
      },
      sections: [
        {
          id: 'hero-1',
          type: 'hero',
          headline: 'Fresh Artisan Bread, Baked Daily',
          subheadline: 'Experience the tradition of handmade pastries and bread in the heart of your neighborhood',
          ctaButton: {
            label: 'Order Now',
            href: '/contact'
          },
          backgroundImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200'
        },
        {
          id: 'features-1',
          type: 'feature',
          items: [
            {
              icon: '🥖',
              title: 'Fresh Daily',
              description: 'All our breads and pastries are baked fresh every morning using traditional methods'
            },
            {
              icon: '🌾',
              title: 'Local Ingredients',
              description: 'We source the finest local ingredients to ensure the best quality and flavor'
            },
            {
              icon: '❤️',
              title: 'Made with Love',
              description: 'Every item is crafted with care and attention to detail by our experienced bakers'
            }
          ]
        },
        {
          id: 'text-1',
          type: 'text',
          content: `## About Bella's Bakery

Welcome to Bella's Bakery, where tradition meets innovation. For over 20 years, we've been serving our community with the finest artisan breads, pastries, and cakes. Our master bakers combine time-honored techniques with modern creativity to bring you unique flavors that keep you coming back.

### Our Story

Started in 2003 by master baker Isabella Rodriguez, our bakery began as a small family operation. Today, we've grown to serve thousands of customers while maintaining our commitment to quality and craftsmanship. Every morning, we start before dawn to ensure your favorite treats are ready when you arrive.`
        },
        {
          id: 'gallery-1',
          type: 'image_gallery',
          images: [
            {
              url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
              alt: 'Fresh artisan bread on display',
              caption: 'Our daily selection of artisan breads'
            },
            {
              url: 'https://images.unsplash.com/photo-1486427944299-d1955d23da34?w=800',
              alt: 'Assorted pastries',
              caption: 'Delicious pastries made fresh daily'
            },
            {
              url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
              alt: 'Chocolate cake',
              caption: 'Custom cakes for any occasion'
            }
          ]
        },
        {
          id: 'contact-1',
          type: 'contact_form',
          fields: [
            { name: 'name', label: 'Name', required: true },
            { name: 'email', label: 'Email', required: true },
            { name: 'message', label: 'Message', required: false }
          ],
          submitLabel: 'Send Message',
          successMessage: 'Thank you! We\'ll get back to you soon.'
        }
      ]
    },
    {
      id: 'page-2',
      slug: 'menu',
      title: 'Our Menu',
      metaTitle: 'Menu - Bella\'s Bakery | Fresh Pastries & Bread',
      metaDescription: 'Browse our selection of artisan breads, pastries, cakes, and specialty items.',
      structuredData: null,
      sections: [
        {
          id: 'text-menu',
          type: 'text',
          content: `## Our Menu

### Breads
- **Sourdough** - $6.50
- **French Baguette** - $5.00
- **Whole Wheat** - $6.00
- **Rye Bread** - $6.50
- **Ciabatta** - $5.50

### Pastries
- **Croissant** - $3.50
- **Almond Croissant** - $4.50
- **Chocolate Eclair** - $4.00
- **Apple Turnover** - $3.50
- **Cinnamon Roll** - $4.00

### Cakes
- **Chocolate Cake** - $35 (8-inch)
- **Vanilla Cake** - $32 (8-inch)
- **Red Velvet** - $38 (8-inch)
- **Cheesecake** - $40 (8-inch)

*All prices subject to change. Custom orders available upon request.*`
        }
      ]
    }
  ],
  footer: {
    contactInfo: '123 Main Street, San Francisco, CA 94102 | Phone: (555) 012-3456 | Email: hello@bellasbakery.com',
    socialLinks: [
      { platform: 'Facebook', url: 'https://facebook.com/bellasbakery' },
      { platform: 'Instagram', url: 'https://instagram.com/bellasbakery' }
    ],
    legalLinks: [
      { text: 'Privacy Policy', slug: 'privacy-policy' },
      { text: 'Terms of Service', slug: 'terms-of-service' }
    ],
    copyrightText: '© 2024 Bella\'s Bakery. All rights reserved.'
  },
  primaryCta: {
    text: 'Call Now',
    phoneNumber: '+15550123456'
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20')
}

/**
 * Mock website storage (in-memory)
 * This simulates a database for local development
 */
class MockWebsiteStore {
  private websites: Map<string, Website> = new Map()

  constructor() {
    // Initialize with sample data
    this.websites.set('mock-user-123', mockWebsite)
  }

  getByUserId(userId: string): Website | null {
    return this.websites.get(userId) || null
  }

  getByDomain(domain: string): Website | null {
    for (const website of this.websites.values()) {
      if (website.domain === domain) {
        return website
      }
    }
    return null
  }

  save(userId: string, website: Website): void {
    this.websites.set(userId, website)
  }

  publish(userId: string, domain: string): void {
    const website = this.websites.get(userId)
    if (website) {
      website.domain = domain
      this.websites.set(userId, website)
    }
  }

  unpublish(userId: string): void {
    const website = this.websites.get(userId)
    if (website) {
      website.domain = undefined
      this.websites.set(userId, website)
    }
  }
}

export const mockWebsiteStore = new MockWebsiteStore()

