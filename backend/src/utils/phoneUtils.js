/**
 * Phone number formatting utilities
 * Based on the reference Python implementation
 */

/**
 * Format phone number to ensure it has the correct prefix
 * - Removes any spaces, dashes, or parentheses
 * - Adds +91 prefix for Indian numbers if not present
 * - Can be adapted for other countries by modifying the country code
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) {
    return null;
  }

  // Remove any non-digit characters except '+'
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If number starts with '0', remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If number starts with '91', ensure it has '+'
  if (cleaned.startsWith('91')) {
    cleaned = '+' + cleaned;
  }

  // If number doesn't have any prefix, add '+91'
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+91' + cleaned;
    }
  }

  // Validate the final format for Indian numbers
  if (!cleaned.startsWith('+91') || cleaned.length !== 13) {
    return null;
  }

  return cleaned;
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phone) => {
  const formatted = formatPhoneNumber(phone);
  return formatted !== null;
};

/**
 * Format phone number for different countries
 * This can be extended for multi-country support
 */
export const formatPhoneNumberByCountry = (phone, countryCode = '+91') => {
  if (!phone) {
    return null;
  }

  // Remove any non-digit characters except '+'
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading zeros
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Handle different country codes
  switch (countryCode) {
    case '+91': // India
      // If number already has country code, validate it
      if (cleaned.startsWith('91')) {
        cleaned = '+' + cleaned;
      } else if (!cleaned.startsWith('+91')) {
        cleaned = '+91' + cleaned;
      }
      
      // Validate Indian number format
      if (!cleaned.startsWith('+91') || cleaned.length !== 13) {
        return null;
      }
      break;

    case '+1': // US/Canada
      if (cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      } else if (!cleaned.startsWith('+1')) {
        cleaned = '+1' + cleaned;
      }
      
      if (!cleaned.startsWith('+1') || cleaned.length !== 12) {
        return null;
      }
      break;

    default:
      return null;
  }

  return cleaned;
};

/**
 * Extract country code from phone number
 */
export const extractCountryCode = (phone) => {
  if (!phone || !phone.startsWith('+')) {
    return null;
  }

  // Common country codes
  if (phone.startsWith('+91')) return '+91';
  if (phone.startsWith('+1')) return '+1';
  if (phone.startsWith('+44')) return '+44';
  if (phone.startsWith('+86')) return '+86';
  
  return null;
};

/**
 * Get display format for phone number
 */
export const getDisplayFormat = (phone) => {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return phone;

  // Format: +91 XXXXX XXXXX
  if (formatted.startsWith('+91')) {
    return formatted.replace(/(\+91)(\d{5})(\d{5})/, '$1 $2 $3');
  }

  return formatted;
};