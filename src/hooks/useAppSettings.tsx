'use client';

import { useEffect, useState, createContext, useContext } from 'react';

/**
 * App Settings — Dynamic configuration from database
 * Replaces all hardcoded brand strings, payment settings, etc.
 *
 * Usage:
 *   const { settings } = useAppSettings();
 *   settings.app_name  // instead of hardcoded "IDOL META"
 */

export interface AppSettings {
  // Brand
  app_name: string;
  app_subtitle: string;
  app_tagline: string;
  app_copyright_year: string;
  app_copyright_holder: string;
  app_description: string;
  app_share_text: string;

  // Logo & Images
  logo_url: string;
  banner_male_url: string;
  banner_female_url: string;

  // Theme
  default_theme: string;

  // Payment defaults
  bank_name: string;
  bank_code: string;
  bank_number: string;
  bank_holder: string;
  gopay_number: string;
  gopay_holder: string;
  ovo_number: string;
  ovo_holder: string;
  dana_number: string;
  dana_holder: string;
  qris_label: string;
  qris_image: string;
  active_payment_methods: string;

  // Tournament defaults
  default_mode: string;
  default_bpm: string;
  default_lokasi: string;
  default_bracket_type: string;
  tournament_name_template_male: string;
  tournament_name_template_female: string;
}

// Fallback defaults (used before API response arrives)
const FALLBACK: AppSettings = {
  app_name: 'IDOL META',
  app_subtitle: 'TARKAM Fan Made Edition',
  app_tagline: 'Borneo Pride',
  app_copyright_year: new Date().getFullYear().toString(),
  app_copyright_holder: 'IDOL META',
  app_description: 'Esports Tournament Platform',
  app_share_text: 'Esports Tournament',
  logo_url: '',
  banner_male_url: '',
  banner_female_url: '',
  default_theme: 'dark',
  bank_name: '',
  bank_code: '',
  bank_number: '',
  bank_holder: '',
  gopay_number: '',
  gopay_holder: '',
  ovo_number: '',
  ovo_holder: '',
  dana_number: '',
  dana_holder: '',
  qris_label: '',
  qris_image: '',
  active_payment_methods: '["qris","bank_transfer","ewallet"]',
  default_mode: 'GR Arena 3vs3',
  default_bpm: '130',
  default_lokasi: '',
  default_bracket_type: 'single_elimination',
  tournament_name_template_male: 'Week {week}',
  tournament_name_template_female: 'Week {week}',
};

// Context for app-wide settings
const AppSettingsContext = createContext<AppSettings>(FALLBACK);

export function AppSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: AppSettings | null;
}) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings || FALLBACK);

  useEffect(() => {
    if (initialSettings) return; // Already have server-provided settings

    // Fetch settings from API
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            if (!cancelled) {
              setSettings(data.settings as AppSettings);
            }
          }
        }
      } catch {
        // Silent — use fallback
      }
    })();

    return () => { cancelled = true; };
  }, [initialSettings]);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): { settings: AppSettings } {
  const settings = useContext(AppSettingsContext);
  return { settings };
}
