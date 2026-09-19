/**
 * Vehicle Manufacturer Logo Utility
 * 
 * Provides case-insensitive matching for vehicle manufacturer logos.
 * Logos are stored in /public/vehicle-logos/ with lowercase filenames.
 */

/**
 * List of available manufacturer logos
 * This list should be updated as new logos are added
 */
const AVAILABLE_LOGOS = [
  'toyota',
  'volkswagen',
  'bmw',
  'mercedes-benz',
  'ford',
  'audi',
  'honda',
  'nissan',
  'hyundai',
  'kia',
  'mazda',
  'subaru',
  'mitsubishi',
  'suzuki',
  'chevrolet',
  'jeep',
  'land-rover',
  'jaguar',
  'volvo',
  'peugeot',
  'renault',
  'citroen',
  'fiat',
  'alfa-romeo',
  'ferrari',
  'lamborghini',
  'porsche',
  'tesla',
  'lexus',
  'infiniti',
  'acura',
  'mini',
  'smart',
  'skoda',
  'seat',
  'opel',
  'vauxhall',
  'chrysler',
  'dodge',
  'ram',
  'gmc',
  'buick',
  'cadillac',
  'lincoln',
  'genesis',
  'maserati',
  'bentley',
  'rolls-royce',
  'aston-martin',
  'mclaren',
  'bugatti',
  'koenigsegg',
  'pagani',
  'rimac',
  'lucid',
  'rivian',
  'polestar',
  'byd',
  'geely',
  'great-wall',
  'chery',
  'haval',
  'mg',
  'tata',
  'mahindra',
  'isuzu',
  'hino',
  'scania',
  'man',
  'volvo-trucks',
  'daf',
  'iveco',
  'ford-trucks',
  'freightliner',
  'kenworth',
  'peterbilt',
  'international',
  'mack',
] as const;

type AvailableLogo = typeof AVAILABLE_LOGOS[number];

/**
 * Common manufacturer abbreviations to full names mapping
 */
const ABBREVIATION_MAP: Record<string, string> = {
  'vw': 'volkswagen',
  'v.w.': 'volkswagen',
  'v.w': 'volkswagen',
  'merc': 'mercedes-benz',
  'benz': 'mercedes-benz',
  'chevy': 'chevrolet',
  'lr': 'land-rover',
  'l.r.': 'land-rover',
  'l.r': 'land-rover',
  'landrover': 'land-rover',
  'citroen': 'citroen',
  'citroën': 'citroen',
};

/**
 * Normalizes a vehicle make string to match logo filename format
 * Converts to lowercase, removes spaces and special characters
 * Also handles common abbreviations
 */
function normalizeMake(make: string): string {
  const normalized = make
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  
  // Check if it's a known abbreviation
  if (ABBREVIATION_MAP[normalized]) {
    return ABBREVIATION_MAP[normalized];
  }
  
  return normalized;
}

/**
 * Gets the logo URL for a vehicle manufacturer
 * 
 * @param make - Vehicle make (e.g., "Toyota", "toyota", "TOYOTA")
 * @returns Logo URL if available, null otherwise
 */
export function getManufacturerLogo(make: string): string | null {
  if (!make || typeof make !== 'string') {
    return null;
  }

  const normalized = normalizeMake(make);
  
  // Check if the normalized make is in our available logos list
  if (AVAILABLE_LOGOS.includes(normalized as AvailableLogo)) {
    return `/vehicle-logos/${normalized}.svg`;
  }

  return null;
}

/**
 * Checks if a logo is available for a given make
 */
export function hasManufacturerLogo(make: string): boolean {
  return getManufacturerLogo(make) !== null;
}

/**
 * Gets all available logo names
 */
export function getAvailableLogos(): readonly string[] {
  return AVAILABLE_LOGOS;
}
