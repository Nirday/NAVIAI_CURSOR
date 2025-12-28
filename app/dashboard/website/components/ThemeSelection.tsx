'use client'

import React, { useState, useEffect } from 'react'
import { Check, AlertCircle, ChevronRight, ChevronLeft, ArrowRight, MousePointer2, Smartphone, LayoutGrid, Calendar, MapPin, Phone, Shield, Star } from 'lucide-react'

// --- 1. TYPE DEFINITIONS (CRITICAL) ---

interface IndustryArchitecture {
  id: string;
  label: string;
  palette: {
    primary: string; // Backgrounds
    accent: string;  // Text/Highlights
    button: string;  // CTA Buttons
    text: string;    // Main Text Color
  };
  vocabulary: {
    cta: string;       // e.g. "Book Ride" vs "Order Now"
    navItems: string[]; 
    heroTitle: string; 
    subTitle: string;
  };
  services: string[];    
  trustSignals: string[]; 
  imageQuery: string;    // Unsplash keyword
}

interface ScrapedData {
  businessName?: string;
  phone?: string;
  city?: string;
  navLinks?: string[];
  industryKeyword?: string;
  aboutSnippet?: string;
}

interface Strategy {
  id: string;
  name: string;
  why: string;
  seoImpact: string;
  idealCustomer: string;
  tradeOff: string;
}

// --- 2. THE SIMULATION ENGINE (The "Brain") ---

const synthesizeIndustryData = (inputKeyword: string = 'general'): IndustryArchitecture => {
  const keyword = inputKeyword.toLowerCase();

  // ARCHETYPE: TRANSPORTATION & LUXURY
  if (['limo', 'car', 'transport', 'shuttle', 'driver', 'taxi', 'limousine', 'chauffeur'].some(k => keyword.includes(k))) {
    return {
      id: 'transport',
      label: 'Luxury Transport',
      palette: {
        primary: 'bg-slate-950',
        accent: 'text-amber-400',
        button: 'bg-gradient-to-r from-amber-500 to-amber-600',
        text: 'text-slate-50'
      },
      vocabulary: {
        cta: "Book Chauffeur",
        navItems: ["Fleet", "Services", "Rates", "Account"],
        heroTitle: "Premium Travel in {city}",
        subTitle: "Experience the ultimate in comfort and style."
      },
      services: ["Airport Transfers", "Corporate Travel", "Special Events", "Hourly Charters"],
      trustSignals: ["SPAB Certified", "Licensed & Insured", "24/7 Dispatch"],
      imageQuery: "black luxury car interior chauffeur"
    };
  }

  // ARCHETYPE: MEDICAL & HEALTH
  if (['dentist', 'doctor', 'clinic', 'health', 'med', 'chiro', 'physician', 'therapy', 'veterinary', 'vet'].some(k => keyword.includes(k))) {
    return {
      id: 'medical',
      label: 'Medical Practice',
      palette: {
        primary: 'bg-white',
        accent: 'text-sky-600',
        button: 'bg-sky-600',
        text: 'text-slate-800'
      },
      vocabulary: {
        cta: "Book Appointment",
        navItems: ["Our Team", "New Patients", "Services", "Portal"],
        heroTitle: "Compassionate Care in {city}",
        subTitle: "Modern medicine with a personal touch."
      },
      services: ["General Checkups", "Cosmetic Procedures", "Emergency Care", "Pediatrics"],
      trustSignals: ["Board Certified", "Top Rated", "Accepting Insurance"],
      imageQuery: "modern medical office doctor smile"
    };
  }

  // ARCHETYPE: TRADES & HOME SERVICES
  if (['plumber', 'hvac', 'roof', 'electric', 'build', 'contractor', 'repair', 'handyman', 'painter', 'landscaper', 'arborist', 'tree'].some(k => keyword.includes(k))) {
    return {
      id: 'trade',
      label: 'Home Services',
      palette: {
        primary: 'bg-slate-50',
        accent: 'text-red-600',
        button: 'bg-red-600',
        text: 'text-slate-900'
      },
      vocabulary: {
        cta: "Get Free Quote",
        navItems: ["Services", "Projects", "Reviews", "Contact"],
        heroTitle: "Reliable {keyword} in {city}",
        subTitle: "Done right the first time. 100% Guaranteed."
      },
      services: ["Emergency Repairs", "Installations", "Maintenance", "Inspections"],
      trustSignals: ["Licensed", "Bonded", "Insured"],
      imageQuery: "construction worker tools house repair"
    };
  }

  // ARCHETYPE: DINING & FOOD
  if (['restaurant', 'food', 'cafe', 'bakery', 'bar', 'pub', 'brewery', 'pizza', 'sushi', 'dining', 'chef', 'catering'].some(k => keyword.includes(k))) {
    return {
      id: 'dining',
      label: 'Dining & Food',
      palette: {
        primary: 'bg-white',
        accent: 'text-orange-600',
        button: 'bg-orange-600',
        text: 'text-slate-800'
      },
      vocabulary: {
        cta: "Order Now",
        navItems: ["Menu", "About", "Catering", "Reservations"],
        heroTitle: "Exceptional Dining in {city}",
        subTitle: "Fresh ingredients, authentic flavors."
      },
      services: ["Dine In", "Takeout", "Catering", "Private Events"],
      trustSignals: ["Fresh Ingredients", "Health Department Approved", "Award Winning"],
      imageQuery: "restaurant food dining elegant"
    };
  }

  // ARCHETYPE: RETAIL & E-COMMERCE
  if (['retail', 'store', 'shop', 'boutique', 'market', 'merchant', 'seller', 'ecommerce', 'online', 'product'].some(k => keyword.includes(k))) {
    return {
      id: 'retail',
      label: 'Retail & E-commerce',
      palette: {
        primary: 'bg-white',
        accent: 'text-emerald-600',
        button: 'bg-emerald-600',
        text: 'text-slate-800'
      },
      vocabulary: {
        cta: "Shop Now",
        navItems: ["Products", "Collections", "About", "Contact"],
        heroTitle: "Quality Products in {city}",
        subTitle: "Shop with confidence, delivered to your door."
      },
      services: ["Product Catalog", "Special Offers", "Gift Services", "Customer Support"],
      trustSignals: ["Secure Checkout", "30-Day Returns", "Free Shipping"],
      imageQuery: "retail store products shopping"
    };
  }

  // ARCHETYPE: LEGAL & PROFESSIONAL
  if (['law', 'attorney', 'lawyer', 'legal', 'court', 'litigation', 'paralegal', 'notary'].some(k => keyword.includes(k))) {
    return {
      id: 'legal',
      label: 'Legal Services',
      palette: {
        primary: 'bg-slate-900',
        accent: 'text-blue-400',
        button: 'bg-blue-600',
        text: 'text-slate-50'
      },
      vocabulary: {
        cta: "Free Consultation",
        navItems: ["Practice Areas", "Our Team", "Resources", "Contact"],
        heroTitle: "Expert Legal Services in {city}",
        subTitle: "Protecting your rights with proven expertise."
      },
      services: ["Legal Consultation", "Case Review", "Document Preparation", "Court Representation"],
      trustSignals: ["Bar Certified", "Licensed Attorney", "Years of Experience"],
      imageQuery: "law legal professional office"
    };
  }

  // DEFAULT ARCHETYPE (General Business)
  return {
    id: 'general',
    label: 'Local Business',
    palette: {
      primary: 'bg-white',
      accent: 'text-indigo-600',
      button: 'bg-indigo-600',
      text: 'text-gray-800'
    },
    vocabulary: {
      cta: "Contact Us",
      navItems: ["Home", "About", "Services", "Contact"],
      heroTitle: "Quality Service in {city}",
      subTitle: "Your trusted local partner."
    },
    services: ["Professional Services", "Consultation", "Support", "Solutions"],
    trustSignals: ["Locally Owned", "5-Star Rated", "Satisfaction Guaranteed"],
    imageQuery: "modern office business team"
  };
};

// --- 3. HELPER: Image URL Generator ---
const getUnsplashUrl = (query: string, width: number = 1600, height: number = 900) => 
  `https://source.unsplash.com/${width}x${height}/?${query.replace(/ /g, ',')}`;

// --- 4. STRATEGY DEFINITIONS ---

const STRATEGIES: Strategy[] = [
  {
    id: 'velocity',
    name: 'The High-Velocity Capture',
    why: 'For urgent service businesses, trust is established in seconds. This layout strips away distractions to focus entirely on immediate conversion, leveraging a sticky "Call Now" button that follows the user. Every pixel is engineered to reduce friction between problem and solution.',
    seoImpact: 'Structure optimized for "Near Me" mobile searches. Service area embedded in schema markup. Fast load times (under 2s) improve mobile ranking signals.',
    idealCustomer: 'The busy homeowner with an urgent problem. They\'re on mobile, they\'re stressed, and they need you NOW—not after scrolling through your portfolio.',
    tradeOff: 'This is aggressive. It prioritizes leads over brand storytelling. Choose this if your phone ringing is the only metric that matters.'
  },
  {
    id: 'showroom',
    name: 'The Premium Positioning',
    why: 'Luxury isn\'t a price point—it\'s a perception. This layout uses full-bleed imagery and elegant typography to justify premium pricing. Your "Before & After" portfolio becomes the hero, allowing visual proof to do the selling. Every interaction reinforces exclusivity.',
    seoImpact: 'Image-heavy structure ranks well for visual search queries. Schema markup emphasizes service quality and premium positioning. Slower load times offset by higher conversion value.',
    idealCustomer: 'The discerning client who researches extensively. They\'re comparing you to 3-5 competitors and need visual proof that you\'re worth the premium.',
    tradeOff: 'Requires REAL high-quality photography. Stock photos will destroy trust. Contact info is intentionally subtle—you\'re filtering for serious buyers only.'
  },
  {
    id: 'authority',
    name: 'The Trust Authority',
    why: 'For professional services, credibility is currency. This layout builds trust through content density—"Meet the Team" sections, detailed FAQs, and local community involvement. It answers questions before customers call, reducing nuisance inquiries and positioning you as the neighborhood expert.',
    seoImpact: 'Text-rich structure dominates "Service + City" keyword rankings. FAQ schema markup captures featured snippets. Local business schema with team members improves E-E-A-T signals.',
    idealCustomer: 'The cautious researcher who reads everything. They\'re comparing credentials, reading reviews, and need to feel confident before picking up the phone.',
    tradeOff: 'Requires significant content creation (staff bios, company history, detailed service pages). Can feel corporate if not personalized. Less visual impact means slower emotional connection.'
  },
  {
    id: 'retail',
    name: 'The Transactional Streamline',
    why: 'For businesses with inventory or menus, speed of transaction is everything. This layout puts products front and center, reducing phone time and enabling self-service ordering. Every element is designed to convert browsers into buyers in under 30 seconds.',
    seoImpact: 'Product schema markup improves visibility in Google Shopping and local inventory ads. Category-based structure ranks for specific product searches. Fast checkout flow reduces bounce rate.',
    idealCustomer: 'The convenience-seeker who knows what they want. They\'re browsing on lunch break or before heading to your location. Speed and clarity beat storytelling.',
    tradeOff: 'Requires daily inventory updates—nothing kills trust faster than "Out of Stock" on popular items. Transactional feel makes brand storytelling difficult. High-res product photos are non-negotiable.'
  },
  {
    id: 'community',
    name: 'The Community Hub',
    why: 'For businesses built on repeat visits, engagement is revenue. This layout prioritizes events, weekly specials, and social proof to build a loyal community. It transforms one-time customers into members who check your site weekly for updates.',
    seoImpact: 'Event schema markup captures "Events Near Me" searches. Fresh content from calendar updates signals active business to Google. Social media integration improves engagement signals.',
    idealCustomer: 'The local regular who wants to stay connected. They\'re checking for weekly specials, upcoming events, or community updates. They\'re not just buying—they\'re joining.',
    tradeOff: 'Looks "dead" if Event Calendar is empty. High maintenance—needs weekly updates to stay relevant. Can distract from primary conversion goals if not managed carefully.'
  }
];

// --- 5. PHONE FORMATTING HELPER ---
const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} • ${digits.slice(3, 6)} • ${digits.slice(6)}`;
  }
  return phone;
};

// --- 6. THEME PREVIEW COMPONENT ---

interface ThemePreviewProps {
  strategy: Strategy;
  scrapedData: ScrapedData;
  architecture: IndustryArchitecture;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ strategy, scrapedData, architecture }) => {
  const businessName = scrapedData.businessName || 'Your Business';
  const phone = scrapedData.phone || '(555) 123-4567';
  const city = scrapedData.city || 'Your City';
  const formattedPhone = formatPhone(phone);
  const heroTitle = architecture.vocabulary.heroTitle.replace('{city}', city);
  const navItems = scrapedData.navLinks || architecture.vocabulary.navItems;
  const services = architecture.services;
  const trustSignals = architecture.trustSignals;
  const imageUrl = getUnsplashUrl(architecture.imageQuery);
  const ctaText = architecture.vocabulary.cta;

  const renderPreview = () => {
    switch (strategy.id) {
      case 'velocity':
        return (
          <div className={`w-full h-full ${architecture.palette.primary} flex flex-col`}>
            {/* Sticky Nav */}
            <div className="h-16 bg-white/95 backdrop-blur-sm border-b shadow-sm flex items-center justify-between px-8 sticky top-0 z-20">
              <div className={`text-xl font-bold ${architecture.palette.text}`}>
                {businessName}
              </div>
              <button className={`px-6 py-2 rounded-lg font-bold text-white ${architecture.palette.button} shadow-lg hover:shadow-xl transition-all`}>
                {ctaText}
              </button>
            </div>
            
            {/* Hero Section - Split Layout */}
            <div className="flex-1 flex">
              <div className="w-1/2 flex flex-col justify-center px-12 bg-gradient-to-br from-slate-50 to-slate-100">
                <h1 className={`text-5xl font-bold mb-4 ${architecture.palette.text} leading-tight`}>
                  {heroTitle}
                </h1>
                <p className={`text-2xl mb-6 ${architecture.palette.accent} font-semibold`}>
                  {formattedPhone}
                </p>
                <p className={`text-lg ${architecture.palette.text} opacity-80 mb-8`}>
                  {architecture.vocabulary.subTitle}
                </p>
                <button className={`w-fit px-8 py-3 rounded-lg font-bold text-white ${architecture.palette.button} shadow-lg hover:shadow-xl transition-all text-lg`}>
                  {ctaText}
                </button>
              </div>
              <div className="w-1/2 relative">
                <img src={imageUrl} alt={businessName} className="w-full h-full object-cover" />
              </div>
            </div>
            
            {/* Trust Bar */}
            <div className="h-20 bg-gray-100 border-t flex items-center justify-center gap-8 px-8">
              {trustSignals.slice(0, 4).map((signal, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{signal}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'showroom':
        return (
          <div className="w-full h-full relative overflow-hidden">
            {/* Full-Bleed Background */}
            <img src={imageUrl} alt={businessName} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent"></div>
            
            {/* Transparent Nav */}
            <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-12 z-20">
              <div className="text-2xl font-serif text-white">
                {businessName}
              </div>
              <div className="flex gap-8">
                {navItems.slice(0, 4).map((item, i) => (
                  <a key={i} href="#" className="text-white/90 uppercase tracking-widest text-sm font-light hover:text-white transition-colors">
                    {item}
                  </a>
                ))}
              </div>
            </div>
            
            {/* Hero Content */}
            <div className="absolute inset-0 flex items-center px-12 z-10">
              <div className="max-w-2xl">
                <h1 className="text-7xl font-serif text-white mb-6 leading-tight">
                  {businessName}
                </h1>
                <p className="text-2xl text-gray-300 mb-8">
                  {architecture.vocabulary.subTitle}
                </p>
                <button className="px-8 py-4 border-2 border-amber-400 bg-transparent text-amber-400 font-semibold text-lg hover:bg-amber-400 hover:text-black transition-all">
                  {ctaText}
                </button>
              </div>
            </div>
          </div>
        );

      case 'authority':
        return (
          <div className={`w-full h-full ${architecture.palette.primary} flex flex-col`}>
            {/* Nav */}
            <div className="h-20 bg-white border-b shadow-md flex items-center justify-between px-12">
              <div className={`text-2xl font-bold ${architecture.palette.text}`}>
                {businessName}
              </div>
              <div className="flex gap-8">
                {navItems.slice(0, 4).map((item, i) => (
                  <a key={i} href="#" className={`${architecture.palette.text} hover:${architecture.palette.accent} font-medium transition-colors`}>
                    {item}
                  </a>
                ))}
              </div>
            </div>
            
            {/* Split Layout */}
            <div className="flex-1 flex h-[600px]">
              <div className="w-[30%] relative">
                <img src={imageUrl} alt={businessName} className="w-full h-full object-cover" />
                <div className="absolute -right-6 top-16 flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-12 bg-white rounded-sm shadow-lg flex items-center justify-center">
                      <Shield className={`w-7 h-7 ${architecture.palette.accent.replace('text-', 'text-')}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 p-12 flex flex-col justify-center bg-white shadow-md">
                <h1 className={`text-5xl font-bold mb-6 ${architecture.palette.text}`}>
                  About {businessName}
                </h1>
                <p className={`text-lg ${architecture.palette.text} leading-relaxed mb-8 max-w-2xl opacity-80`}>
                  {scrapedData.aboutSnippet || `Serving ${city} and the surrounding area. We provide ${architecture.vocabulary.subTitle.toLowerCase()}.`}
                </p>
                <div className="flex flex-wrap gap-4">
                  {trustSignals.slice(0, 3).map((signal, i) => (
                    <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${architecture.palette.accent.replace('text-', 'bg-').replace('text-', 'border-')} bg-opacity-10 border-opacity-30`}>
                      <Shield className={`w-5 h-5 ${architecture.palette.accent}`} />
                      <span className={`text-sm font-medium ${architecture.palette.text}`}>{signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'retail':
        return (
          <div className={`w-full h-full ${architecture.palette.primary} flex flex-col`}>
            {/* Search Bar */}
            <div className="h-20 bg-gray-50 border-b flex items-center justify-between px-12">
              <div className="flex-1 max-w-2xl h-12 bg-white border-2 rounded-lg px-6 flex items-center text-gray-400 shadow-sm text-lg">
                Search products...
              </div>
              <div className={`text-xl font-bold ${architecture.palette.accent}`}>
                {businessName}
              </div>
            </div>
            
            {/* Product Grid */}
            <div className="flex-1 p-8 grid grid-cols-4 gap-6 overflow-y-auto">
              {services.map((service, i) => (
                <div key={i} className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                  <div className="w-full h-48 relative">
                    {i === 0 ? (
                      <img src={imageUrl} alt={service} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${
                        i % 4 === 0 ? 'from-emerald-100 to-emerald-200' :
                        i % 4 === 1 ? 'from-blue-100 to-blue-200' :
                        i % 4 === 2 ? 'from-purple-100 to-purple-200' :
                        'from-orange-100 to-orange-200'
                      }`}></div>
                    )}
                    <div className={`absolute top-3 right-3 ${architecture.palette.button} text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md`}>
                      ${120 + i * 15}
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <button className={`${architecture.palette.button} text-white text-xs rounded-full px-3 py-1.5 font-semibold shadow-md hover:opacity-90 transition-all`}>
                        {ctaText}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'community':
        return (
          <div className={`w-full h-full ${architecture.palette.primary} flex flex-col`}>
            {/* Tab Navigation */}
            <div className="h-16 bg-gray-50 border-b flex items-center px-12 gap-8">
              {navItems.slice(0, 4).map((item, i) => (
                <button
                  key={i}
                  className={`text-base font-medium transition-colors pb-2 ${
                    i === 0 
                      ? `${architecture.palette.accent} border-b-2 ${architecture.palette.accent.replace('text-', 'border-')}` 
                      : `${architecture.palette.text} hover:${architecture.palette.accent}`
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            
            {/* Dashboard Layout */}
            <div className="flex-1 flex h-[600px]">
              {/* Calendar Sidebar */}
              <div className="w-[25%] border-r bg-gray-50 p-6">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
                  <div className="bg-red-500 h-12 flex items-center justify-center">
                    <span className="text-white text-sm font-bold uppercase">
                      {new Date().toLocaleString('default', { month: 'short' })} {new Date().getFullYear()}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="text-xs text-gray-500 text-center font-semibold">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <div 
                          key={day} 
                          className={`aspect-square flex items-center justify-center text-xs rounded ${
                            day === new Date().getDate() 
                              ? `${architecture.palette.button} text-white font-bold` 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feed */}
              <div className="flex-1 p-8 overflow-y-auto">
                <h2 className={`text-3xl font-bold mb-6 ${architecture.palette.text}`}>
                  Community Updates
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <div className="h-5 bg-gray-300 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="w-full h-full bg-gray-200"></div>;
    }
  };

  return (
    <div className="w-full h-full rounded-xl border border-white/20 shadow-2xl bg-white overflow-hidden">
      {/* Browser Chrome */}
      <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-inner"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-inner"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-inner"></div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="h-5 bg-white border border-slate-300 rounded-full px-4 flex items-center justify-center text-[10px] text-gray-400 max-w-xs">
            {businessName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || 'yourbusiness'}.com
          </div>
        </div>
      </div>
      
      {/* Scaled Desktop Content */}
      <div className="relative w-full h-[calc(100%-2rem)] overflow-hidden bg-white rounded-b-xl">
        <div className="origin-top-left transform scale-[0.45] w-[222%] h-[222%] bg-white">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

// --- 7. MAIN THEME SELECTION COMPONENT ---

interface ThemeSelectionProps {
  onSelect?: (themeId: string) => void;
  onContinue?: (themeId: string) => void;
  initialSelection?: string;
  businessProfile?: {
    businessName?: string;
    industry?: string;
    location?: { city?: string };
    contactInfo?: { phone?: string };
    services?: Array<{ name: string }>;
  };
  scrapedData?: ScrapedData;
}

export default function ThemeSelection({
  onSelect,
  onContinue,
  initialSelection,
  businessProfile,
  scrapedData
}: ThemeSelectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const currentStrategy = STRATEGIES[currentIndex];
  
  // Merge scraped data with business profile
  const mergedData: ScrapedData = {
    businessName: scrapedData?.businessName || businessProfile?.businessName || 'Angel Worldwide Transportation',
    phone: scrapedData?.phone || businessProfile?.contactInfo?.phone || '(800) 123-4567',
    city: scrapedData?.city || businessProfile?.location?.city || 'San Francisco Bay Area',
    navLinks: scrapedData?.navLinks || businessProfile?.services?.map(s => s.name) || undefined,
    industryKeyword: scrapedData?.industryKeyword || businessProfile?.industry?.toLowerCase() || 'limousine',
    aboutSnippet: scrapedData?.aboutSnippet
  };
  
  // Synthesize industry architecture
  const architecture = synthesizeIndustryData(mergedData.industryKeyword || 'general');
  
  useEffect(() => {
    if (initialSelection) {
      const index = STRATEGIES.findIndex(s => s.id === initialSelection);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [initialSelection]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % STRATEGIES.length);
      setIsTransitioning(false);
    }, 200);
  };

  const handlePrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + STRATEGIES.length) % STRATEGIES.length);
      setIsTransitioning(false);
    }, 200);
  };

  const handleApprove = () => {
    onContinue?.(currentStrategy.id);
    onSelect?.(currentStrategy.id);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Strategic Website Design Proposals
        </h1>
        <p className="text-gray-600">
          Our team has prepared {STRATEGIES.length} tailored strategies for your business
        </p>
      </div>

      {/* Split-Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Live Preview (60%) */}
        <div className="w-full lg:w-[60%] bg-gray-100 flex items-center justify-center p-4 lg:p-8">
          <div className={`w-full max-w-2xl transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <ThemePreview 
              strategy={currentStrategy}
              scrapedData={mergedData}
              architecture={architecture}
            />
          </div>
        </div>

        {/* Right: Strategic Proposal (40%) */}
        <div className="hidden lg:flex lg:w-[40%] bg-white/60 backdrop-blur-md border-l border-gray-200 overflow-y-auto">
          <div className={`p-8 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <div className="text-sm font-semibold text-gray-500 mb-2">
              Strategy {currentIndex + 1} of {STRATEGIES.length}
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {currentStrategy.name}
            </h2>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                The Strategy
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {currentStrategy.why}
              </p>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-2">
                SEO Impact
              </h3>
              <p className="text-sm text-blue-800">
                {currentStrategy.seoImpact}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Ideal Customer Profile
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {currentStrategy.idealCustomer}
              </p>
            </div>

            <div className="mb-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wide mb-2">
                Honest Assessment
              </h3>
              <p className="text-sm text-amber-800 italic">
                {currentStrategy.tradeOff}
              </p>
            </div>

            <button
              onClick={handleApprove}
              className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Initialize {mergedData.businessName} with Strategy {currentIndex + 1}
            </button>
          </div>
        </div>

        {/* Mobile: Strategic Proposal */}
        <div className="lg:hidden w-full bg-white/90 backdrop-blur-sm border-t border-gray-200 overflow-y-auto max-h-[50vh]">
          <div className={`p-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <div className="text-sm font-semibold text-gray-500 mb-2">
              Strategy {currentIndex + 1} of {STRATEGIES.length}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentStrategy.name}
            </h2>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                The Strategy
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {currentStrategy.why}
              </p>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                SEO Impact
              </h3>
              <p className="text-xs text-blue-800">
                {currentStrategy.seoImpact}
              </p>
            </div>
            <button
              onClick={handleApprove}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-base rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Initialize {mergedData.businessName} with Strategy {currentIndex + 1}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-8 py-4 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={isTransitioning}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-semibold">Previous Strategy</span>
        </button>

        <div className="flex gap-2">
          {STRATEGIES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-blue-600 w-8' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={isTransitioning}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-semibold">Next Strategy</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
