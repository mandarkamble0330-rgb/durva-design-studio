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
  description: string | null
  status: 'draft' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

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
