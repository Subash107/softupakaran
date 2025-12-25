## Terraform bootstrap for SoftUpakaran

This directory contains starter Terraform configuration for provisioning Render services that host the **backend** API and the **frontend** static site. The configuration is intentionally minimal—it wires the Render provider to the same repository you already deploy manually and exposes variables so you can customize service names, branches, plans, and secrets.

### Prerequisites

1. Install Terraform 1.5 or newer.
2. Obtain a Render API key with permissions to manage services (Settings → API Keys).

### Quick start

1. Copy the Terraform directory into a separate workspace (you can keep it inside this repo).
2. Create a `terraform.tfvars` file (or provide `-var` flags) that sets at least:
   ```hcl
   render_api_key = "REPLACE_WITH_LONG_API_KEY"
   backend_env = {
     API_BASE = "https://<backend-service>.onrender.com"
   }
   ```
3. Run the usual commands:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
4. After apply, note the outputs `backend_service_url` and `frontend_service_url`, and update the frontend configuration if necessary (the frontend repo may need to know the backend base URL).

### What to customize

- `modules/web-service` is a reusable module that declares a `render_service`. Adjust the build/start commands or add environment variables (`backend_env`, `frontend_env`) to match your workflow.
- Update the default repo/branch variables if the repo or default branch differs from your fork.
- You can add additional Terraform files to provision databases, DNS records, or other services as needed.

### Git integration tip

Treat this directory as the infrastructure layer. Commit changes to `terraform/` along with your app changes so deployments stay reproducible, or move the folder to a separate infrastructure repo if teams prefer isolation.
