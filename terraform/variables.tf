variable "render_api_key" {
  description = "API key for Render operations."
  type        = string
}

variable "region" {
  description = "Render deployment region."
  type        = string
  default     = "oregon"
}

variable "name" {
  description = "Name of the Render service to manage."
  type        = string
}

variable "service_type" {
  description = "Render service type (e.g., static_site, web_service)."
  type        = string
  default     = "static_site"
}

variable "repo" {
  description = "Git repository that backs the Render service."
  type        = string
}

variable "branch" {
  description = "Git branch deployed by Render."
  type        = string
  default     = "main"
}

variable "build_command" {
  description = "Command Render runs to build the service."
  type        = string
  default     = "npm install && npm run build"
}

variable "start_command" {
  description = "Command Render runs to start the service."
  type        = string
  default     = ""
}

variable "env" {
  description = "Node type or environment label for the Render service."
  type        = string
  default     = "static"
}

variable "plan" {
  description = "Render plan to use for the service."
  type        = string
  default     = "starter"
}

variable "env_variables" {
  description = "Map of environment variables exposed to the Render service."
  type        = map(string)
  default     = {}
}

variable "backend_env" {
  description = "Legacy backend env payload (unused in this module)."
  type        = map(string)
  default     = {}
}

variable "backend_api_base" {
  description = "Legacy backend API base (unused in this module)."
  type        = string
  default     = ""
}

variable "VERCEL_API_TOKEN" {
  description = "Legacy Vercel token placeholder."
  type        = string
  default     = ""
}

variable "render_region" {
  description = "Region placeholder kept for workspace compatibility."
  type        = string
  default     = ""
}
