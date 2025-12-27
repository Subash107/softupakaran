terraform {
  required_version = ">= 1.5"

  required_providers {
    render = {
      source  = "render/render"
      version = ">= 1.29.0"
    }
  }
}

provider "render" {
  api_key = var.render_api_key
  region  = var.render_region
}

module "backend_service" {
  source = "./modules/web-service"

  name          = var.backend_service_name
  repo          = var.repo
  branch        = var.branch
  service_type  = "web_service"
  env           = "node"
  plan          = var.render_plan
  build_command = "npm install && npm run build"
  start_command = "npm run start"
  env_variables = merge(var.backend_env, {
    NODE_ENV = "production"
  })
  region        = var.render_region
}

module "frontend_service" {
  source = "./modules/web-service"

  name          = var.frontend_service_name
  repo          = var.repo
  branch        = var.branch
  service_type  = "static_site"
  env           = "static"
  plan          = var.render_plan
  build_command = "npm install && npm run build"
  start_command = ""
  env_variables = merge(var.frontend_env, {
    NODE_ENV = "production"
  })
  region        = var.render_region
}
