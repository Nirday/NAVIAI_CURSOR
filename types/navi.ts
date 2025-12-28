/**
 * Master Contract: Centralized Type Definitions
 * This is the only shape the app should ever trust for profile data.
 * Prevents data mismatch errors and ensures compile-time safety.
 */

export interface ModuleConfig {
  website_builder?: {
    services_list: string[];
    hero_headline?: string;
  };
  crm_data?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  brand?: {
    archetype?: string;
    tone?: string;
  };
}

export interface BusinessProfile {
  module_config: ModuleConfig;
  markdown_report: string; // The full dossier text
}


