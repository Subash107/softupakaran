variable "render_api_key" {
  type        = string
  description = "Render API key with permissions to create/update services."
}

variable "render_region" {
  type        = string
  default     = "oregon"
  description = "Render region where services should be deployed."
}

variable "repo" {
  type        = string
  description = "GitHub repository in the format owner/repo that hosts this project."
  default     = "Subash107/softupakaran"
}

variable "branch" {
  type        = string
  default     = "main"
  description = "Branch that Render should deploy."
}

variable "render_plan" {
  type        = string
  default     = "starter"
  description = "Render plan to use for both services."
}

variable "backend_service_name" {
  type        = string
  default     = "softupakaran-backend"
}

variable "frontend_service_name" {
  type        = string
  default     = "softupakaran-frontend"
}

variable "backend_env" {
  type        = map(string)
  default     = {}
  description = "Additional Render environment variables for the backend service."
}

variable "frontend_env" {
  type        = map(string)
  default     = {}
  description = "Additional Render environment variables for the frontend service."
}
