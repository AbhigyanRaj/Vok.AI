// Translations for multilingual support
export const TRANSLATIONS = {
  english: {
    greeting: {
      default: "Hello {name}, this is an automated call from {company}. How are you doing today?",
      simple: "Hello {name}, thank you for your time today."
    },
    confirmation: {
      proceed: "Great! Let me ask you a few questions. This will only take a few minutes. Shall we proceed?",
      ready: "Are you ready to continue?"
    },
    decline: {
      message: "No problem! We understand. Thank you for your time. Have a great day!",
      callback: "Would you like us to call you back at a better time?"
    },
    noResponse: {
      message: "I didn't catch that. Could you please repeat?",
      retry: "I'm sorry, I couldn't hear you clearly. Let me try again."
    },
    retryPrompt: {
      message: "I didn't quite get that. Could you please say that again?",
      final: "I'm having trouble understanding. Let me move to the next question."
    },
    outro: {
      default: "Thank you so much for your time, {name}. We really appreciate your responses. Have a wonderful day!",
      simple: "Thank you for your time. Goodbye!"
    },
    final: {
      message: "This concludes our call. Thank you and goodbye!",
      appreciation: "We appreciate your participation. Take care!"
    },
    errors: {
      technical: "We're experiencing technical difficulties. We'll call you back shortly.",
      timeout: "I'm sorry, we seem to have lost connection. We'll try again later."
    }
  },
  hindi: {
    greeting: {
      default: "नमस्ते {name}, यह {company} की ओर से एक स्वचालित कॉल है। आप कैसे हैं?",
      simple: "नमस्ते {name}, आपके समय के लिए धन्यवाद।"
    },
    confirmation: {
      proceed: "बहुत अच्छा! मैं आपसे कुछ सवाल पूछना चाहूंगा। इसमें केवल कुछ मिनट लगेंगे। क्या हम आगे बढ़ें?",
      ready: "क्या आप जारी रखने के लिए तैयार हैं?"
    },
    decline: {
      message: "कोई बात नहीं! हम समझते हैं। आपके समय के लिए धन्यवाद। आपका दिन शुभ हो!",
      callback: "क्या आप चाहेंगे कि हम आपको बेहतर समय पर वापस कॉल करें?"
    },
    noResponse: {
      message: "मुझे समझ नहीं आया। क्या आप कृपया दोहरा सकते हैं?",
      retry: "क्षमा करें, मैं आपको स्पष्ट रूप से नहीं सुन सका। मैं फिर से कोशिश करता हूं।"
    },
    retryPrompt: {
      message: "मुझे वह ठीक से समझ नहीं आया। क्या आप कृपया फिर से कह सकते हैं?",
      final: "मुझे समझने में परेशानी हो रही है। चलिए अगले सवाल पर चलते हैं।"
    },
    outro: {
      default: "आपके समय के लिए बहुत-बहुत धन्यवाद, {name}। हम आपके जवाबों की सराहना करते हैं। आपका दिन मंगलमय हो!",
      simple: "आपके समय के लिए धन्यवाद। अलविदा!"
    },
    final: {
      message: "यह हमारी कॉल समाप्त होती है। धन्यवाद और अलविदा!",
      appreciation: "हम आपकी भागीदारी की सराहना करते हैं। ध्यान रखें!"
    },
    errors: {
      technical: "हमें तकनीकी कठिनाइयों का सामना करना पड़ रहा है। हम जल्द ही आपको वापस कॉल करेंगे।",
      timeout: "क्षमा करें, लगता है कि हमारा कनेक्शन टूट गया है। हम बाद में फिर कोशिश करेंगे।"
    }
  }
};

/**
 * Get translated text based on language
 * @param {string} language - 'english' or 'hindi'
 * @param {string} category - Category of text (greeting, confirmation, etc.)
 * @param {string} key - Specific key within category
 * @param {object} replacements - Object with values to replace in template
 * @returns {string} Translated text
 */
export function getTranslation(language = 'english', category, key = 'default', replacements = {}) {
  const lang = language.toLowerCase();
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.english;
  
  let text = translations[category]?.[key] || translations[category]?.default || '';
  
  // Replace placeholders like {name}, {company}
  Object.keys(replacements).forEach(placeholder => {
    text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacements[placeholder]);
  });
  
  return text;
}

/**
 * Get voice ID based on language and base voice
 * @param {string} baseVoice - Base voice like 'NEERJA', 'PRABHAT'
 * @param {string} language - 'english' or 'hindi'
 * @returns {string} Voice ID with language suffix if needed
 */
export function getVoiceForLanguage(baseVoice, language = 'english') {
  // Ensure baseVoice is uppercase for consistency
  const normalizedVoice = baseVoice.toUpperCase();
  
  if (language.toLowerCase() === 'hindi') {
    // Append _HI suffix for Hindi voices if not already present
    const hindiVoice = normalizedVoice.includes('_HI') ? normalizedVoice : `${normalizedVoice}_HI`;
    console.log(`🌐 Voice language mapping: ${baseVoice} + Hindi → ${hindiVoice}`);
    return hindiVoice;
  }
  // Remove _HI suffix for English voices
  const englishVoice = normalizedVoice.replace('_HI', '');
  console.log(`🌐 Voice language mapping: ${baseVoice} + English → ${englishVoice}`);
  return englishVoice;
}
