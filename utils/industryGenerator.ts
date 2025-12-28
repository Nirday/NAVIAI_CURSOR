/**
 * Generative Intelligence Engine - "Smart Simulator"
 * 
 * This module acts as our LLM for now, taking raw business inputs and returning
 * polished IndustryArchitecture configurations. It replaces hardcoded theme logic
 * with a token-based, context-aware system that adapts to ANY industry.
 * 
 * Key Features:
 * - Service Model Detection (storefront vs service_area vs hybrid)
 * - Geo-Scope Intelligence (auto-generates region labels)
 * - Infinite Industry Support via Token Mapping
 * - Context-Aware Vocabulary Generation
 */

import { ServiceModel } from '@/libs/chat-core/src/types';

// Export IndustryArchitecture type for use in components
export interface IndustryArchitecture {
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
  // Hyper-Local Fields
  localVocabulary: {
    serviceAreaTitle: string; // e.g., "Serving {city} & Surrounding Areas"
    localSocialProof: string; // e.g., "Voted Best in {city}", "5-Star Local Reviews"
    locationLabel: string;    // e.g., "Visit Our Showroom", "Dispatch Center"
  };
  conversionFocus: 'call' | 'visit' | 'book' | 'order'; // Dictates the sticky mobile button
  trustBadges: string[]; // e.g. "Locally Owned", "Licensed in {state}"
  trafficIntent: 'emergency' | 'destination' | 'appointment'; // Traffic Intent Classification
  // Regional Service Area Fields
  serviceModel: 'service_area' | 'storefront' | 'hybrid'; // Service delivery model
  geoLabel: string; // Smart geographic label (e.g., "San Francisco & The Bay Area")
}

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
  if (['creative', 'design', 'art', 'photography', 'video', 'media', 'marketing', 'brand', 'graphic', 'artist', 'studio', 'pottery', 'ceramic', 'drone'].some(t => text.includes(t))) {
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
  if (['nature', 'outdoor', 'animal', 'pet', 'dog', 'cat', 'walk', 'garden', 'landscape', 'tree', 'plant', 'green', 'grooming'].some(t => text.includes(t))) {
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

// Service Model Classification (Regional Service Areas)
export const classifyServiceModel = (tokens: string[]): ServiceModel => {
  const text = tokens.join(' ').toLowerCase();
  
  // Service Area Businesses (Mobile - Go to Client)
  // Keywords: mobile, serving, area, van, delivery, etc.
  const serviceAreaKeywords = [
    'mobile', 'serving', 'area', 'van', 'delivery',
    'limo', 'limousine', 'chauffeur', 'transport', 'shuttle', 'taxi', 'driver',
    'plumber', 'electrician', 'hvac', 'contractor', 'handyman', 'roof', 'roofer',
    'landscaper', 'landscape', 'tree', 'arborist', 'cleaning', 'cleaner', 'maid',
    'construction', 'builder', 'towing', 'tow', 'locksmith', 'pest', 'exterminator',
    'delivery', 'moving', 'mover', 'painter', 'welder', 'mechanic', 'repair',
    'grooming', 'walker', 'sitter'
  ];
  
  if (serviceAreaKeywords.some(k => text.includes(k))) {
    return 'service_area';
  }
  
  // Storefront Businesses (Stationary - Client Comes to Business)
  // Keywords: clinic, studio, restaurant, office, visit, etc.
  const storefrontKeywords = [
    'clinic', 'studio', 'restaurant', 'cafe', 'bakery', 'bar', 'pub', 'brewery', 'dining',
    'dentist', 'doctor', 'medical', 'hospital', 'pharmacy',
    'gym', 'fitness', 'salon', 'spa', 'barber', 'nail', 'massage',
    'store', 'shop', 'retail', 'boutique', 'market', 'showroom',
    'law', 'attorney', 'lawyer', 'legal', 'office', 'accountant',
    'gallery', 'pottery', 'art', 'workshop', 'visit'
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
      normalizedCity.includes('palo alto') || normalizedCity.includes('berkeley') ||
      normalizedCity.includes('hayward') || normalizedCity.includes('fremont')) {
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
export const generateGeoLabel = (city: string, serviceModel: ServiceModel): string => {
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
  } else if (text.includes('dog') || text.includes('pet') || text.includes('walk') || text.includes('grooming')) {
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
  } else if (text.includes('drone') || text.includes('photography')) {
    return ["Aerial Photography", "Video Production", "Inspection Services", "Event Coverage"];
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
  
  if (text.includes('dog') || text.includes('pet') || text.includes('walk') || text.includes('grooming')) {
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
  } else if (text.includes('drone') || text.includes('photography')) {
    return "drone aerial photography professional";
  }
  
  return "modern office business professional";
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

/**
 * Main Generative Function - "Smart Simulator"
 * 
 * Takes raw business description and generates a complete IndustryArchitecture
 * that adapts to ANY industry without hardcoded switch statements.
 * 
 * @param businessDescription - Raw business description (e.g., "Bay Area Limo" or "Drone Pilot")
 * @param city - Business city
 * @param state - Business state
 * @returns Complete IndustryArchitecture configuration
 */
export const generateIndustryArchitecture = async (
  businessDescription: string, 
  city: string = '{city}', 
  state: string = '{state}'
): Promise<IndustryArchitecture> => {
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

