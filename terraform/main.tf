terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = ">= 1.8.0"
    }
  }
}

provider "render" {
  alias   = "module"
  api_key = var.render_api_key
  region  = var.region
}

resource "render_service" "this" {
  provider     = render.module
  name         = var.name
  service_type = var.service_type
  repo         = var.repo
  branch       = var.branch
  build_command = var.build_command
  start_command = var.start_command
  env          = var.env
  plan         = var.plan
  auto_deploy  = true
  region       = var.region

  env_variables = var.env_variables
}

output "service_id" {
  value = render_service.this.id
}

output "service_url" {
  value = render_service.this.service_url
}
