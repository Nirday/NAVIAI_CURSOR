/**
 * Core data structures for the Conversational AI Core module
 * This file defines the foundational types used across the Navi AI platform
 */

export interface BusinessProfile {
  userId: string;
  businessName: string;
  industry: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  services: {
    name: string;
    description: string;
    price?: string;
  }[];
  hours: {
    day: string;
    open: string;
    close: string;
  }[];
  brandVoice: 'friendly' | 'professional' | 'witty' | 'formal';
  targetAudience: string;
  customAttributes: {
    label: string;
    value: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  messageId?: string; // Optional: Added if storing persistently
  userId: string; // Added for storage
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date; // Added for storage
}

export interface PartialBusinessProfile {
  businessName?: string;
  industry?: string;
  location?: Partial<BusinessProfile['location']>;
  contactInfo?: Partial<BusinessProfile['contactInfo']>;
  services?: string[];
  hours?: Partial<BusinessProfile['hours']>;
  brandVoice?: Partial<BusinessProfile['brandVoice']>;
  targetAudience?: Partial<BusinessProfile['targetAudience']>;
  customAttributes?: BusinessProfile['customAttributes'];
}

export interface ConversationHistory {
  messages: ChatMessage[];
  context: {
    currentIntent?: string;
    pendingClarification?: string;
    lastProfileUpdate?: Date;
  };
}

export interface IntentAnalysis {
  intent: 'UPDATE_PROFILE' | 'USER_CORRECTION' | 'CREATE_WEBSITE' | 'WRITE_BLOG' | 'GET_SUGGESTIONS' | 'CREATE_PAGE' | 'DELETE_PAGE' | 'RENAME_PAGE' | 'UPDATE_PAGE_CONTENT' | 'GENERATE_LEGAL_PAGES' | 'GET_ANALYTICS' | 'ADD_EMBED' | 'BILLING_QUESTION' | 'UNKNOWN';
  entities: Record<string, any>;
  needsClarification: boolean;
  clarificationQuestion?: string;
  confidence: number;
}

export interface ProfileEmbedding {
  userId: string;
  content: string;
  embedding: number[];
  createdAt: Date;
}

export interface SuggestionPrompt {
  id: string;
  text: string;
  category: 'aha_moment' | 'gap_analysis' | 'goal_framing' | 'seo_opportunity';
  priority: 'high' | 'medium' | 'low';
  isActionable: boolean;
  createdAt: Date;
  metadata?: {
    seoOpportunityId?: string;
    seoInsightId?: string;
    pageType?: string; // e.g., 'faq', 'blog', 'testimonial'
    keyword?: string;
  };
}

export interface ScrapedProfileData {
  businessName?: string;
  industry?: string;
  services?: string[];
  location?: Partial<BusinessProfile['location']>;
  contactInfo?: Partial<BusinessProfile['contactInfo']>;
  description?: string;
  socialLinks?: { platform: string; url: string; }[];
  confidence: number; // 0-1 score of extraction confidence
  extractionMethod?: 'cheerio' | 'puppeteer' | 'multipage'; // Method used for content extraction
  missing_data_report?: string[]; // Human-readable list of missing data items
}
