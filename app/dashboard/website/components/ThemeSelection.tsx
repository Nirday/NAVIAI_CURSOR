'use client'

import React, { useState, useEffect } from 'react'
import { Check, AlertCircle, ChevronRight, ChevronLeft, ArrowRight, MousePointer2, Smartphone, LayoutGrid, Calendar, MapPin, Phone, Shield, Star, MapPinned } from 'lucide-react'
import { generateIndustryArchitecture, type IndustryArchitecture } from '@/utils/industryGenerator'

// --- 1. TYPE DEFINITIONS (CRITICAL) ---

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

// --- 2. THE GENERATIVE AI ENGINE (The "Brain") ---

// Vibe Detection Types
type VibeType = 'calming' | 'tech' | 'playful' | 'serious' | 'luxury' | 'energetic' | 'trustworthy' | 'creative' | 'natural' | 'professional';

interface VibeProfile {
  vibe: VibeType;
  palette: {
    primary: string;
    accent: string;
    button: string;
    text: string;
  };
  fontStyle: 'sans' | 'serif';
}

// Token-based Vibe Detection (Simulates LLM reasoning)
const detectVibe = (tokens: string[]): VibeProfile => {
  const text = tokens.join(' ').toLowerCase();
  
  // Health/Wellness/Balance/Yoga -> Calming
  if (['health', 'wellness', 'balance', 'yoga', 'meditation', 'spa', 'therapy', 'chiropractor', 'massage', 'acupuncture', 'holistic', 'healing', 'care', 'wellbeing'].some(t => text.includes(t))) {
    return {
      vibe: 'calming',
      palette: {
        primary: 'bg-white',
        accent: 'text-emerald-600',
        button: 'bg-emerald-600',
        text: 'text-slate-800'
      },
      fontStyle: 'sans'
    };
  }
  
  // Tech/Cyber/Data/Software -> Tech
  if (['tech', 'cyber', 'data', 'software', 'digital', 'it', 'computer', 'network', 'security', 'cloud', 'saas', 'platform', 'app', 'developer', 'programming'].some(t => text.includes(t))) {
    return {
      vibe: 'tech',
      palette: {
        primary: 'bg-slate-900',
        accent: 'text-cyan-400',
        button: 'bg-cyan-600',
        text: 'text-slate-50'
      },
      fontStyle: 'sans'
    };
  }
  
  // Kids/Fun/Party/Entertainment -> Playful
  if (['kid', 'child', 'fun', 'party', 'event', 'entertainment', 'play', 'game', 'toy', 'birthday', 'celebration', 'festival'].some(t => text.includes(t))) {
    return {
      vibe: 'playful',
      palette: {
        primary: 'bg-white',
        accent: 'text-purple-600',
        button: 'bg-gradient-to-r from-purple-500 to-pink-500',
        text: 'text-slate-800'
      },
      fontStyle: 'sans'
    };
  }
  
  // Finance/Law/Consult/Account -> Serious
  if (['finance', 'law', 'legal', 'attorney', 'account', 'consult', 'advisory', 'financial', 'tax', 'audit', 'compliance', 'forensic'].some(t => text.includes(t))) {
    return {
      vibe: 'serious',
      palette: {
        primary: 'bg-slate-900',
        accent: 'text-blue-400',
        button: 'bg-blue-600',
        text: 'text-slate-50'
      },
      fontStyle: 'serif'
    };
  }
  
  // Luxury/Premium/Elite -> Luxury
  if (['luxury', 'premium', 'elite', 'exclusive', 'high-end', 'limo', 'chauffeur', 'concierge', 'private', 'boutique'].some(t => text.includes(t))) {
    return {
      vibe: 'luxury',
      palette: {
        primary: 'bg-slate-950',
        accent: 'text-amber-400',
        button: 'bg-gradient-to-r from-amber-500 to-amber-600',
        text: 'text-slate-50'
      },
      fontStyle: 'serif'
    };
  }
  
  // Food/Restaurant/Energy -> Energetic
  if (['food', 'restaurant', 'cafe', 'bakery', 'pizza', 'sushi', 'dining', 'chef', 'catering', 'bar', 'brewery'].some(t => text.includes(t))) {
    return {
      vibe: 'energetic',
      palette: {
        primary: 'bg-white',
        accent: 'text-orange-600',
        button: 'bg-orange-600',
        text: 'text-slate-800'
      },
      fontStyle: 'sans'
    };
  }
  
  // Medical/Doctor/Clinic -> Trustworthy
  if (['medical', 'doctor', 'clinic', 'dentist', 'physician', 'veterinary', 'vet', 'hospital', 'pharmacy', 'nurse'].some(t => text.includes(t))) {
    return {
      vibe: 'trustworthy',
      palette: {
        primary: 'bg-white',
        accent: 'text-sky-600',
        button: 'bg-sky-600',
        text: 'text-slate-800'
      },
      fontStyle: 'sans'
    };
  }
  
  // Creative/Design/Art -> Creative
  if (['creative', 'design', 'art', 'photography', 'video', 'media', 'marketing', 'brand', 'graphic', 'artist', 'studio', 'pottery', 'ceramic'].some(t => text.includes(t))) {
    return {
      vibe: 'creative',
      palette: {
        primary: 'bg-white',
        accent: 'text-indigo-600',
        button: 'bg-indigo-600',
        text: 'text-slate-800'
      },
      fontStyle: 'sans'
    };
  }
  
  // Nature/Outdoor/Animal -> Natural
  if (['nature', 'outdoor', 'animal', 'pet', 'dog', 'cat', 'walk', 'garden', 'landscape', 'tree', 'plant', 'green'].some(t => text.includes(t))) {
    return {
      vibe: 'natural',
      palette: {
        primary: 'bg-white',
        accent: 'text-green-600',
        button: 'bg-green-600',
        text: 'text-slate-800'
      },
      fontStyle: 'sans'
    };
  }
  
  // Trade/Service/Repair -> Professional
  if (['trade', 'service', 'repair', 'plumber', 'electric', 'contractor', 'build', 'hvac', 'roof', 'handyman'].some(t => text.includes(t))) {
    return {
      vibe: 'professional',
      palette: {
        primary: 'bg-slate-50',
        accent: 'text-red-600',
        button: 'bg-red-600',
        text: 'text-slate-900'
      },
      fontStyle: 'sans'
    };
  }
  
  // Default: Professional
  return {
    vibe: 'professional',
    palette: {
      primary: 'bg-white',
      accent: 'text-indigo-600',
      button: 'bg-indigo-600',
      text: 'text-gray-800'
    },
    fontStyle: 'sans'
  };
};

// Dynamic Vocabulary Construction
const generateVocabulary = (tokens: string[], vibe: VibeType, businessName: string): IndustryArchitecture['vocabulary'] => {
  const text = tokens.join(' ').toLowerCase();
  
  // CTA Detection
  let cta = "Contact Us";
  if (text.includes('health') || text.includes('care') || text.includes('doctor') || text.includes('clinic') || text.includes('appointment')) {
    cta = "Book Appointment";
  } else if (text.includes('shop') || text.includes('store') || text.includes('retail') || text.includes('product')) {
    cta = "Shop Now";
  } else if (text.includes('service') || text.includes('quote') || text.includes('estimate') || text.includes('repair')) {
    cta = "Get Free Quote";
  } else if (text.includes('food') || text.includes('restaurant') || text.includes('order') || text.includes('menu')) {
    cta = "Order Now";
  } else if (text.includes('book') || text.includes('reserve') || text.includes('chauffeur') || text.includes('limo')) {
    cta = "Book Now";
  } else if (text.includes('consult') || text.includes('legal') || text.includes('attorney')) {
    cta = "Free Consultation";
  }
  
  // Nav Items
  const navItems: string[] = [];
  if (text.includes('health') || text.includes('medical')) {
    navItems.push("Our Team", "Services", "New Patients", "Portal");
  } else if (text.includes('shop') || text.includes('retail')) {
    navItems.push("Products", "Collections", "About", "Contact");
  } else if (text.includes('food') || text.includes('restaurant')) {
    navItems.push("Menu", "About", "Catering", "Reservations");
  } else if (text.includes('service') || text.includes('trade')) {
    navItems.push("Services", "Projects", "Reviews", "Contact");
  } else {
    navItems.push("Home", "About", "Services", "Contact");
  }
  
  // Hero Title
  const cityPlaceholder = "{city}";
  let heroTitle = `Quality Service in ${cityPlaceholder}`;
  if (text.includes('health') || text.includes('care')) {
    heroTitle = `Compassionate Care in ${cityPlaceholder}`;
  } else if (text.includes('luxury') || text.includes('premium')) {
    heroTitle = `Premium Service in ${cityPlaceholder}`;
  } else if (text.includes('food') || text.includes('dining')) {
    heroTitle = `Exceptional Dining in ${cityPlaceholder}`;
  }
  
  // Subtitle
  let subTitle = "Your trusted local partner.";
  if (vibe === 'calming') {
    subTitle = "Holistic wellness for your mind and body.";
  } else if (vibe === 'tech') {
    subTitle = "Innovative solutions for modern businesses.";
  } else if (vibe === 'playful') {
    subTitle = "Making every moment memorable.";
  } else if (vibe === 'serious') {
    subTitle = "Protecting your interests with proven expertise.";
  } else if (vibe === 'luxury') {
    subTitle = "Experience the ultimate in comfort and style.";
  } else if (vibe === 'energetic') {
    subTitle = "Fresh ingredients, authentic flavors.";
  } else if (vibe === 'trustworthy') {
    subTitle = "Modern medicine with a personal touch.";
  } else if (vibe === 'creative') {
    subTitle = "Bringing your vision to life.";
  } else if (vibe === 'natural') {
    subTitle = "Caring for what matters most.";
  }
  
  return { cta, navItems, heroTitle, subTitle };
};

// Generate Services Array
const generateServices = (tokens: string[], vibe: VibeType): string[] => {
  const text = tokens.join(' ').toLowerCase();
  
  if (text.includes('health') || text.includes('wellness') || text.includes('chiropractor')) {
    return ["Wellness Consultation", "Therapeutic Services", "Preventive Care", "Holistic Treatment"];
  } else if (text.includes('dog') || text.includes('pet') || text.includes('walk')) {
    return ["Dog Walking", "Pet Sitting", "Pet Care Services", "Daily Visits"];
  } else if (text.includes('cyber') || text.includes('security') || text.includes('tech')) {
    return ["Security Assessment", "Threat Monitoring", "Incident Response", "Compliance Consulting"];
  } else if (text.includes('pottery') || text.includes('ceramic') || text.includes('art')) {
    return ["Custom Pottery", "Workshop Classes", "Ceramic Repair", "Artisan Pieces"];
  } else if (text.includes('pizza') || text.includes('food')) {
    return ["Dine In", "Takeout", "Catering", "Private Events"];
  } else if (text.includes('doctor') || text.includes('medical')) {
    return ["General Checkups", "Specialized Care", "Emergency Services", "Preventive Medicine"];
  } else if (text.includes('service') || text.includes('repair')) {
    return ["Emergency Repairs", "Installations", "Maintenance", "Inspections"];
  }
  
  return ["Primary Service", "Secondary Service", "Specialty Service", "Consultation"];
};

// Generate Trust Signals
const generateTrustSignals = (tokens: string[], vibe: VibeType): string[] => {
  const text = tokens.join(' ').toLowerCase();
  
  if (text.includes('health') || text.includes('medical') || text.includes('doctor')) {
    return ["Board Certified", "Top Rated", "Accepting Insurance", "Years of Experience"];
  } else if (text.includes('legal') || text.includes('attorney') || text.includes('law')) {
    return ["Bar Certified", "Licensed Attorney", "Client Confidentiality", "Proven Track Record"];
  } else if (text.includes('service') || text.includes('trade') || text.includes('repair')) {
    return ["Licensed", "Bonded", "Insured", "Satisfaction Guaranteed"];
  } else if (text.includes('food') || text.includes('restaurant')) {
    return ["Fresh Ingredients", "Health Department Approved", "Award Winning", "Local Favorite"];
  } else if (text.includes('shop') || text.includes('retail')) {
    return ["Secure Checkout", "30-Day Returns", "Free Shipping", "Customer Reviews"];
  } else if (text.includes('tech') || text.includes('cyber')) {
    return ["Certified Professionals", "GDPR Compliant", "Secure Infrastructure", "24/7 Support"];
  }
  
  return ["Locally Owned", "5-Star Rated", "Satisfaction Guaranteed", "Trusted Service"];
};

// Generate Image Query
const generateImageQuery = (tokens: string[], vibe: VibeType): string => {
  const text = tokens.join(' ').toLowerCase();
  
  if (text.includes('dog') || text.includes('pet') || text.includes('walk')) {
    return "dog walker professional pet care";
  } else if (text.includes('cyber') || text.includes('security')) {
    return "cybersecurity technology professional";
  } else if (text.includes('pottery') || text.includes('ceramic')) {
    return "pottery studio ceramic art handmade";
  } else if (text.includes('health') || text.includes('wellness') || text.includes('chiropractor')) {
    return "wellness center health professional calm";
  } else if (text.includes('pizza') || text.includes('food')) {
    return "pizza restaurant food dining";
  } else if (text.includes('luxury') || text.includes('limo')) {
    return "black luxury car interior chauffeur";
  } else if (text.includes('medical') || text.includes('doctor')) {
    return "modern medical office doctor smile";
  } else if (text.includes('tech') || text.includes('digital')) {
    return "technology computer modern office";
  }
  
  return "modern office business professional";
};

// Traffic Intent Classification (Hyper-Local)
type TrafficIntent = 'emergency' | 'destination' | 'appointment';

const classifyTrafficIntent = (tokens: string[]): TrafficIntent => {
  const text = tokens.join(' ').toLowerCase();
  
  // Emergency/Service: Business comes to customer
  if (['plumber', 'electrician', 'hvac', 'locksmith', 'towing', 'repair', 'emergency', 'service', 'contractor', 'handyman', 'roof', 'pest', 'cleaning', 'delivery'].some(t => text.includes(t))) {
    return 'emergency';
  }
  
  // Destination/Visit: Customer comes to business
  if (['bakery', 'cafe', 'restaurant', 'gym', 'salon', 'spa', 'store', 'shop', 'retail', 'showroom', 'gallery', 'studio', 'gym', 'fitness'].some(t => text.includes(t))) {
    return 'destination';
  }
  
  // Appointment/Professional: Scheduled visits
  if (['doctor', 'dentist', 'chiropractor', 'lawyer', 'attorney', 'accountant', 'therapist', 'counselor', 'consultant', 'clinic', 'office'].some(t => text.includes(t))) {
    return 'appointment';
  }
  
  // Default: Service Area Business (safest for SMBs)
  return 'emergency';
};

// Service Model Classification (Regional Service Areas)
type ServiceModel = 'service_area' | 'storefront' | 'hybrid';

const classifyServiceModel = (tokens: string[]): ServiceModel => {
  const text = tokens.join(' ').toLowerCase();
  
  // Service Area Businesses (Mobile - Go to Client)
  const serviceAreaKeywords = [
    'limo', 'limousine', 'chauffeur', 'transport', 'shuttle', 'taxi', 'driver',
    'plumber', 'electrician', 'hvac', 'contractor', 'handyman', 'roof', 'roofer',
    'landscaper', 'landscape', 'tree', 'arborist', 'cleaning', 'cleaner', 'maid',
    'construction', 'builder', 'towing', 'tow', 'locksmith', 'pest', 'exterminator',
    'delivery', 'moving', 'mover', 'painter', 'welder', 'mechanic', 'repair'
  ];
  
  if (serviceAreaKeywords.some(k => text.includes(k))) {
    return 'service_area';
  }
  
  // Storefront Businesses (Stationary - Client Comes to Business)
  const storefrontKeywords = [
    'dentist', 'doctor', 'clinic', 'medical', 'hospital', 'pharmacy',
    'restaurant', 'cafe', 'bakery', 'bar', 'pub', 'brewery', 'dining',
    'gym', 'fitness', 'salon', 'spa', 'barber', 'nail', 'massage',
    'store', 'shop', 'retail', 'boutique', 'market', 'showroom',
    'law', 'attorney', 'lawyer', 'legal', 'office', 'accountant',
    'gallery', 'studio', 'pottery', 'art', 'workshop'
  ];
  
  if (storefrontKeywords.some(k => text.includes(k))) {
    return 'storefront';
  }
  
  // Hybrid: Can be both (e.g., some chiropractors have office + house calls)
  if (['chiropractor', 'therapist', 'counselor', 'consultant', 'wellness', 'health'].some(k => text.includes(k))) {
    return 'hybrid';
  }
  
  // Default: Service Area (safest for SMBs)
  return 'service_area';
};

// Mega-Region Mapping (Smart Geographic Expansion)
const getMegaRegion = (city: string): string => {
  const normalizedCity = city.toLowerCase().trim();
  
  // San Francisco Bay Area
  if (normalizedCity.includes('san francisco') || normalizedCity.includes('sf') || 
      normalizedCity.includes('oakland') || normalizedCity.includes('san jose') ||
      normalizedCity.includes('palo alto') || normalizedCity.includes('berkeley')) {
    return 'The Bay Area';
  }
  
  // New York Tri-State
  if (normalizedCity.includes('new york') || normalizedCity.includes('nyc') ||
      normalizedCity.includes('brooklyn') || normalizedCity.includes('queens') ||
      normalizedCity.includes('manhattan') || normalizedCity.includes('bronx')) {
    return 'Tri-State Area';
  }
  
  // Los Angeles / Southern California
  if (normalizedCity.includes('los angeles') || normalizedCity.includes('la') ||
      normalizedCity.includes('san diego') || normalizedCity.includes('orange county') ||
      normalizedCity.includes('anaheim') || normalizedCity.includes('long beach')) {
    return 'Southern California';
  }
  
  // Chicago Metro
  if (normalizedCity.includes('chicago') || normalizedCity.includes('naperville') ||
      normalizedCity.includes('evanston')) {
    return 'Greater Chicago Area';
  }
  
  // Dallas-Fort Worth
  if (normalizedCity.includes('dallas') || normalizedCity.includes('fort worth') ||
      normalizedCity.includes('dfw')) {
    return 'DFW Metroplex';
  }
  
  // Houston Metro
  if (normalizedCity.includes('houston')) {
    return 'Greater Houston Area';
  }
  
  // Phoenix Metro
  if (normalizedCity.includes('phoenix') || normalizedCity.includes('scottsdale') ||
      normalizedCity.includes('tempe')) {
    return 'Phoenix Metro Area';
  }
  
  // Seattle Metro
  if (normalizedCity.includes('seattle') || normalizedCity.includes('bellevue')) {
    return 'Puget Sound Region';
  }
  
  // Boston Metro
  if (normalizedCity.includes('boston') || normalizedCity.includes('cambridge')) {
    return 'Greater Boston Area';
  }
  
  // Miami Metro
  if (normalizedCity.includes('miami') || normalizedCity.includes('fort lauderdale')) {
    return 'South Florida';
  }
  
  // Default: Generic metro area
  return 'Metro Area';
};

// Generate Smart Geo Label
const generateGeoLabel = (city: string, serviceModel: ServiceModel): string => {
  if (!city || city === '{city}') {
    return serviceModel === 'service_area' ? 'Your Region' : 'Your City';
  }
  
  if (serviceModel === 'service_area') {
    const megaRegion = getMegaRegion(city);
    // If we found a mega-region match, use it
    if (megaRegion !== 'Metro Area') {
      return `${city} & ${megaRegion}`;
    }
    // Otherwise use generic metro
    return `${city} & Surrounding Areas`;
  } else if (serviceModel === 'storefront') {
    // Storefronts stay in the city
    return city;
  } else {
    // Hybrid: Show both
    const megaRegion = getMegaRegion(city);
    if (megaRegion !== 'Metro Area') {
      return `${city} & ${megaRegion}`;
    }
    return `${city} & Surrounding Areas`;
  }
};

// Generate Local Vocabulary (Updated for Service Model)
const generateLocalVocabulary = (
  tokens: string[], 
  trafficIntent: TrafficIntent, 
  serviceModel: ServiceModel,
  geoLabel: string
): IndustryArchitecture['localVocabulary'] => {
  const text = tokens.join(' ').toLowerCase();
  
  let serviceAreaTitle = `Serving ${geoLabel}`;
  let localSocialProof = `5-Star Local Reviews in ${geoLabel}`;
  let locationLabel = "Visit Our Location";
  
  if (serviceModel === 'service_area') {
    // Service Area: Mobile businesses
    if (trafficIntent === 'emergency') {
      serviceAreaTitle = `Serving ${geoLabel}`;
      localSocialProof = `Trusted by ${geoLabel.split(' &')[0]} Homeowners`;
      locationLabel = "Dispatch Center";
    } else {
      serviceAreaTitle = `Serving ${geoLabel}`;
      localSocialProof = `Trusted Service Across ${geoLabel}`;
      locationLabel = "Service Area";
    }
  } else if (serviceModel === 'storefront') {
    // Storefront: Stationary businesses
    if (trafficIntent === 'destination') {
      serviceAreaTitle = `Located in the Heart of ${geoLabel}`;
      localSocialProof = `Voted Best in ${geoLabel}`;
      locationLabel = "Visit Our Showroom";
    } else if (trafficIntent === 'appointment') {
      serviceAreaTitle = `Serving the ${geoLabel} Community`;
      localSocialProof = `Top-Rated in ${geoLabel}`;
      locationLabel = "Our Office Location";
    } else {
      serviceAreaTitle = `Located in ${geoLabel}`;
      localSocialProof = `Local Favorite in ${geoLabel}`;
      locationLabel = "Visit Our Location";
    }
  } else {
    // Hybrid: Both service area and storefront
    serviceAreaTitle = `Serving ${geoLabel}`;
    localSocialProof = `Trusted in ${geoLabel}`;
    locationLabel = "Our Location";
  }
  
  return {
    serviceAreaTitle,
    localSocialProof,
    locationLabel
  };
};

// Generate Trust Badges (Local-Focused)
const generateTrustBadges = (tokens: string[], trafficIntent: TrafficIntent, state: string = '{state}'): string[] => {
  const text = tokens.join(' ').toLowerCase();
  
  if (trafficIntent === 'emergency') {
    return ["Locally Owned", `Licensed in ${state}`, "24/7 Emergency Service", "Insured & Bonded"];
  } else if (trafficIntent === 'destination') {
    return ["Locally Owned", "Family Business", "Community Favorite", "Established in {city}"];
  } else if (trafficIntent === 'appointment') {
    return ["Locally Owned", `Licensed in ${state}`, "Board Certified", "Years of Experience"];
  }
  
  return ["Locally Owned", "5-Star Rated", "Satisfaction Guaranteed", "Trusted Service"];
};

// Determine Conversion Focus
const determineConversionFocus = (trafficIntent: TrafficIntent, tokens: string[]): 'call' | 'visit' | 'book' | 'order' => {
  const text = tokens.join(' ').toLowerCase();
  
  if (trafficIntent === 'emergency') {
    return 'call';
  } else if (trafficIntent === 'destination') {
    if (['restaurant', 'food', 'cafe', 'bakery', 'pizza', 'sushi'].some(t => text.includes(t))) {
      return 'order';
    }
    return 'visit';
  } else if (trafficIntent === 'appointment') {
    return 'book';
  }
  
  return 'call'; // Default for service area businesses
};

// Main Generative Function (Simulates AI call)
const generateThemeConfig = async (businessDescription: string, city: string = '{city}', state: string = '{state}'): Promise<IndustryArchitecture> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Tokenize input
  const tokens = businessDescription
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter(t => t.length > 2)
    .map(t => t.replace(/[^a-z0-9]/g, ''));
  
  // Detect vibe
  const vibeProfile = detectVibe(tokens);
  
  // Classify traffic intent (Hyper-Local)
  const trafficIntent = classifyTrafficIntent(tokens);
  
  // Classify service model (Regional Service Areas)
  const serviceModel = classifyServiceModel(tokens);
  
  // Generate smart geo label
  const geoLabel = generateGeoLabel(city, serviceModel);
  
  // Generate vocabulary
  const vocabulary = generateVocabulary(tokens, vibeProfile.vibe, businessDescription);
  
  // Generate local vocabulary (with service model awareness)
  const localVocabulary = generateLocalVocabulary(tokens, trafficIntent, serviceModel, geoLabel);
  
  // Generate services
  const services = generateServices(tokens, vibeProfile.vibe);
  
  // Generate trust signals
  const trustSignals = generateTrustSignals(tokens, vibeProfile.vibe);
  
  // Generate trust badges (local-focused)
  const trustBadges = generateTrustBadges(tokens, trafficIntent, state);
  
  // Determine conversion focus
  const conversionFocus = determineConversionFocus(trafficIntent, tokens);
  
  // Generate image query
  const imageQuery = generateImageQuery(tokens, vibeProfile.vibe);
  
  // Determine label
  let label = 'Local Business';
  if (vibeProfile.vibe === 'calming') label = 'Wellness & Health';
  else if (vibeProfile.vibe === 'tech') label = 'Technology Services';
  else if (vibeProfile.vibe === 'playful') label = 'Entertainment & Events';
  else if (vibeProfile.vibe === 'serious') label = 'Professional Services';
  else if (vibeProfile.vibe === 'luxury') label = 'Luxury Services';
  else if (vibeProfile.vibe === 'energetic') label = 'Dining & Food';
  else if (vibeProfile.vibe === 'trustworthy') label = 'Medical Practice';
  else if (vibeProfile.vibe === 'creative') label = 'Creative Services';
  else if (vibeProfile.vibe === 'natural') label = 'Pet & Nature Services';
  else if (vibeProfile.vibe === 'professional') label = 'Home Services';
  
  return {
    id: vibeProfile.vibe,
    label,
    palette: vibeProfile.palette,
    vocabulary,
    services,
    trustSignals,
    imageQuery,
    localVocabulary,
    conversionFocus,
    trustBadges,
    trafficIntent,
    serviceModel,
    geoLabel
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
  // 1. Base Data Extraction
  const businessName = scrapedData.businessName || 'Your Business';
  const phone = scrapedData.phone || '(555) 123-4567';
  const city = scrapedData.city || 'Your City';
  const formattedPhone = formatPhone(phone);
  
  // 2. Logic Calculation (MUST be before usage)
  // Use the smart geoLabel if the generator created one (e.g. "SF Bay Area"), otherwise fallback to city.
  const geoLabel = architecture.geoLabel || city;
  
  // 3. Derived Content Construction
  // Now we can safely use geoLabel
  const heroTitle = architecture.vocabulary.heroTitle.replace('{city}', geoLabel);
  const subTitle = architecture.vocabulary.subTitle?.replace('{city}', geoLabel) || architecture.vocabulary.subTitle;
  
  // 4. Remaining Data
  const navItems = scrapedData.navLinks || architecture.vocabulary.navItems;
  const services = architecture.services;
  const trustSignals = architecture.trustSignals;
  const imageUrl = getUnsplashUrl(architecture.imageQuery);
  const ctaText = architecture.vocabulary.cta;
  
  // Local elements
  const serviceAreaTitle = architecture.localVocabulary.serviceAreaTitle.replace('{city}', city).replace('{geoLabel}', geoLabel);
  const localSocialProof = architecture.localVocabulary.localSocialProof.replace('{city}', city).replace('{geoLabel}', geoLabel);
  const locationLabel = architecture.localVocabulary.locationLabel;
  const trustBadges = architecture.trustBadges;
  const conversionFocus = architecture.conversionFocus;
  const serviceModel = architecture.serviceModel;
  
  // Phone priority: giant for call-focused, subtle for others
  const phoneSize = conversionFocus === 'call' ? 'text-4xl' : 'text-xl';
  
  // Hero subtext based on service model
  const heroSubtext = serviceModel === 'service_area' 
    ? `Dispatching locally from ${city}.`
    : architecture.vocabulary.subTitle;

  const renderPreview = () => {
    switch (strategy.id) {
      case 'velocity':
        return (
          <div className={`w-full h-full ${architecture.palette.primary} flex flex-col`}>
            {/* Sticky Nav */}
            <div className="h-16 bg-white/95 backdrop-blur-sm border-b shadow-sm flex items-center justify-between px-8 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className={`text-xl font-bold ${architecture.palette.text}`}>
                  {businessName}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  {serviceModel === 'service_area' ? (
                    <>
                      <MapPinned className="w-4 h-4" />
                      <span>Serving {geoLabel}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Located in {geoLabel}</span>
                    </>
                  )}
                </div>
              </div>
              <button className={`px-6 py-2 rounded-lg font-bold text-white ${architecture.palette.button} shadow-lg hover:shadow-xl transition-all`}>
                {ctaText}
              </button>
            </div>
            
            {/* Hero Section - Split Layout */}
            <div className="flex-1 flex">
              <div className="w-1/2 flex flex-col justify-center px-12 bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Service Area / Location Badge */}
                {serviceModel === 'service_area' ? (
                  <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 w-fit">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">{serviceAreaTitle}</span>
                  </div>
                ) : (
                  <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 w-fit">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{serviceAreaTitle}</span>
                  </div>
                )}
                
                <h1 className={`text-5xl font-bold mb-4 ${architecture.palette.text} leading-tight`}>
                  {heroTitle.replace('{city}', geoLabel)}
                </h1>
                
                {/* Phone Number - Priority based on conversion focus */}
                <p className={`${phoneSize} mb-6 ${architecture.palette.accent} font-bold`}>
                  {formattedPhone}
                </p>
                
                {/* Google Review Badge */}
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{localSocialProof}</span>
                </div>
                
                <p className={`text-lg ${architecture.palette.text} opacity-80 mb-8`}>
                  {heroSubtext}
                </p>
                
                <div className="flex gap-4">
                  <button className={`w-fit px-8 py-3 rounded-lg font-bold text-white ${architecture.palette.button} shadow-lg hover:shadow-xl transition-all text-lg`}>
                    {serviceModel === 'service_area' 
                      ? 'Call Now' 
                      : serviceModel === 'storefront' && conversionFocus === 'order'
                      ? 'Order Pickup'
                      : serviceModel === 'storefront'
                      ? 'Get Directions'
                      : ctaText}
                  </button>
                  {serviceModel === 'storefront' && conversionFocus !== 'order' && (
                    <button className="w-fit px-6 py-3 rounded-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all text-lg flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Get Directions
                    </button>
                  )}
                </div>
              </div>
              <div className="w-1/2 relative">
                <img src={imageUrl} alt={businessName} className="w-full h-full object-cover" />
              </div>
            </div>
            
            {/* Local Trust Badges Bar */}
            <div className="h-20 bg-gray-100 border-t flex items-center justify-center gap-8 px-8">
              {trustBadges.slice(0, 4).map((badge, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{badge.replace('{city}', city)}</span>
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
  const [isGenerating, setIsGenerating] = useState(true);
  const [architecture, setArchitecture] = useState<IndustryArchitecture | null>(null);
  
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
  
  // Generate theme config on mount
  useEffect(() => {
    const generateConfig = async () => {
      setIsGenerating(true);
      
      // Build business description from available data
      const businessDescription = [
        mergedData.businessName,
        mergedData.industryKeyword,
        businessProfile?.industry,
        ...(businessProfile?.services?.map(s => s.name) || [])
      ]
        .filter(Boolean)
        .join(' ');
      
      try {
        const city = mergedData.city || '{city}';
        const state = businessProfile?.location?.state || '{state}';
        const generated = await generateIndustryArchitecture(businessDescription || 'general business', city, state);
        setArchitecture(generated);
      } catch (error) {
        console.error('Error generating theme config:', error);
        // Fallback to default
        const fallback = await generateIndustryArchitecture('general business', mergedData.city || '{city}', businessProfile?.location?.state || '{state}');
        setArchitecture(fallback);
      } finally {
        setIsGenerating(false);
      }
    };
    
    generateConfig();
  }, [mergedData.businessName, mergedData.industryKeyword, mergedData.city, businessProfile?.industry, businessProfile?.services, businessProfile?.location?.state]);
  
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
          {isGenerating ? (
            <div className="w-full max-w-2xl flex flex-col items-center justify-center p-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mb-6"></div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Navi is analyzing your local market...
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                We're generating a custom theme configuration based on your business type and regional context.
              </p>
            </div>
          ) : architecture ? (
            <div className={`w-full max-w-2xl transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <ThemePreview 
                strategy={currentStrategy}
                scrapedData={mergedData}
                architecture={architecture}
              />
            </div>
          ) : (
            <div className="w-full max-w-2xl flex items-center justify-center p-12">
              <p className="text-gray-500">Unable to generate theme configuration.</p>
            </div>
          )}
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

            {/* Local SEO Focus */}
            {architecture && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wide mb-2">
                  Local SEO Optimization
                </h3>
                <div className="space-y-2 text-sm text-green-800">
                  {/* Service Model Explanation */}
                  {architecture.serviceModel === 'service_area' && (
                    <p>
                      <strong>Service Area Business:</strong> We detected that you serve a region ({architecture.geoLabel}), not just a single location. This matches Google's SAB classification and ensures your service area is clearly communicated to customers searching from surrounding cities.
                    </p>
                  )}
                  {architecture.serviceModel === 'storefront' && (
                    <p>
                      <strong>Storefront Business:</strong> We detected that customers visit your physical location in {architecture.geoLabel}. The "Get Directions" button and map pin align with Google Maps, making it easy for local searchers to find you.
                    </p>
                  )}
                  {architecture.serviceModel === 'hybrid' && (
                    <p>
                      <strong>Hybrid Service Model:</strong> We detected that you offer both in-office and mobile services. The design accommodates both service area and storefront elements to maximize local visibility.
                    </p>
                  )}
                  
                  {/* Conversion Focus */}
                  {architecture.conversionFocus === 'call' && (
                    <p>
                      <strong>Phone-First Design:</strong> We prioritized your phone number because local searchers convert 3x faster via voice calls. The giant phone display reduces friction for urgent service requests.
                    </p>
                  )}
                  {architecture.conversionFocus === 'visit' && (
                    <p>
                      <strong>Location-First Design:</strong> We emphasized your physical location because destination businesses need to guide customers to your door. The "Get Directions" CTA aligns with Google Maps behavior.
                    </p>
                  )}
                  {architecture.conversionFocus === 'book' && (
                    <p>
                      <strong>Appointment-First Design:</strong> We optimized for booking because professional services require scheduling. The "Free Consultation" CTA builds trust before commitment.
                    </p>
                  )}
                  <p className="mt-2">
                    <strong>Local Trust Signals:</strong> {architecture.localVocabulary.localSocialProof} and {architecture.trustBadges[0]} badges create immediate credibility with local searchers.
                  </p>
                </div>
              </div>
            )}

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
