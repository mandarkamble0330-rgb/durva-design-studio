// Core domain types for Durva Design Studio

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  status: 'draft' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string

  // Section 1 – Project Basics
  project_name: string
  client_name: string
  company_name: string
  exhibition_name: string
  industry_type: string
  event_date: string | null

  // Section 2 – Booth Dimensions
  booth_size: string
  ceiling_height: string
  meeting_rooms: number
  entry_exit_points: number

  // Section 3 – Design Language
  design_theme: string
  primary_color: string
  secondary_color: string

  // Section 4 – Zones & Elements
  zones: string[]

  // Section 5 – Materials & Lighting
  flooring_type: string
  lighting_preferences: string[]

  // Section 6 – Client Brief
  branding_requirements: string
  product_categories: string
  required_zones: string
  display_requirements: string
  visitor_engagement: string
  color_guidelines: string

  // Section 7 – References
  logo_url: string | null
  reference_images: string[]
  reference_pdfs: string[]
  reference_pdf_pages: string
  additional_requirements: string
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>

export interface BoothDesign {
  id: string
  project_id: string
  prompt: string
  ai_response: string | null
  image_url: string | null
  settings: BoothSettings
  created_at: string
}

export interface BoothSettings {
  size: string
  style: string
  industry: string
  color_scheme: string
  features: string[]
}

export const INDUSTRY_TYPES = [
  'Technology',
  'Healthcare',
  'Automotive',
  'FMCG',
  'Real Estate',
  'Education',
  'Finance',
  'Manufacturing',
  'Retail',
  'Energy',
  'Pharma',
  'Telecom',
  'Other',
] as const

export const BOOTH_SIZES = [
  '3x3 (9 sqm)',
  '3x6 (18 sqm)',
  '6x6 (36 sqm)',
  '6x9 (54 sqm)',
  '9x9 (81 sqm)',
  '9x12 (108 sqm)',
  '12x12 (144 sqm)',
  'Custom',
] as const

export const DESIGN_THEMES = [
  'Modern Minimalist',
  'Industrial',
  'Futuristic',
  'Eco / Sustainable',
  'Luxury Premium',
  'Tech Forward',
  'Corporate Classic',
  'Artistic / Creative',
  'Custom',
] as const

export const ZONES_LIST = [
  'Reception',
  'Meeting Room',
  'Product Display Area',
  'Lounge Area',
  'Gaming Zone',
  'Storage Area',
  'LED Screen Area',
  'Interactive Screens',
  'AR/VR',
  'Robotic Arm',
  'Product Launch Stage',
  'Other',
] as const

export const FLOORING_TYPES = [
  'Carpet',
  'Wooden Laminate',
  'Vinyl',
  'Raised Platform',
  'Glass Floor',
  'Custom',
] as const

export const LIGHTING_OPTIONS = [
  'Spotlights',
  'LED Strips',
  'Backlit Panels',
  'Ambient Lighting',
  'Neon Accents',
  'Projection Mapping',
  'Natural Daylight Simulation',
  'Custom',
] as const
