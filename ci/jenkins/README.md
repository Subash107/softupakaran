# Jenkins Docker + nginx proxy

1. **Generate TLS certificates** (self-signed for local dev):
   ```bash
   mkdir -p ci/jenkins/certs
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -subj "/CN=jenkins.local" \
     -keyout ci/jenkins/certs/jenkins.key \
     -out ci/jenkins/certs/jenkins.crt
   ```

2. **Start Jenkins + nginx**:
   ```bash
   cd ci/jenkins
   docker compose up --build -d
   ```
   Jenkins listens on `http://localhost:8082`, but nginx now proxies it via HTTPS at `https://localhost`.

3. **Access Jenkins**:  
   * Browse to `https://localhost/` (accept the self-signed warning).  
   * Unlock with the password from `docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`.

4. **Webhook reminder**: point GitLab’s webhook to `https://localhost/gitlab/notify_commit` using the shared secret you set during trigger configuration.

5. **Next**: Terraform is still paused pending Render’s provider binary. Once you have that binary, mirror it under `infrastructure/terraform/render-provider-mirror/registry.terraform.io/render/render/<version>/<platform>/`, keep the `provider_installation` block in `infrastructure/terraform/main.tf`, rerun `terraform init -reconfigure`, and rerun the Jenkins pipeline to complete the `terraform plan` stage.
