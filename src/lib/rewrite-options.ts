/** Output languages for AI rewrite */
export const REWRITE_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi (हिंदी)' },
  { value: 'gujarati', label: 'Gujarati (ગુજરાતી)' },
  { value: 'marathi', label: 'Marathi (मराठी)' },
  { value: 'tamil', label: 'Tamil (தமிழ்)' },
  { value: 'telugu', label: 'Telugu (తెలుగు)' },
  { value: 'bengali', label: 'Bengali (বাংলা)' },
  { value: 'kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { value: 'malayalam', label: 'Malayalam (മലയാളം)' },
  { value: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { value: 'urdu', label: 'Urdu (اردو)' },
  { value: 'odia', label: 'Odia (ଓଡ଼ିଆ)' },
  { value: 'assamese', label: 'Assamese (অসমীয়া)' },
] as const

/** Heading tag for main headline (article title, once at start) */
export const HEADING_FORMATS = [
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
] as const

/** Subheading tag for section titles (between headline and body) - same options as headline */
export const SUBHEADING_FORMATS = [
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
] as const

/** Tag for body paragraphs */
export const PARAGRAPH_TAGS = [
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
  { value: 'p', label: '<p> (Paragraph)' },
] as const
