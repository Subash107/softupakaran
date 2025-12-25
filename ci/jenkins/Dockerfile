FROM jenkins/jenkins:lts

USER root

# Install tools Jenkinsfile will need: Git, curl, unzip, Terraform, Node.js, and Docker CLI.
RUN apt-get update && \
    apt-get install -y git curl unzip gnupg2 && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    curl -fsSL https://releases.hashicorp.com/terraform/1.14.3/terraform_1.14.3_linux_amd64.zip -o /tmp/terraform.zip && \
    unzip /tmp/terraform.zip -d /usr/local/bin && \
    rm /tmp/terraform.zip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Docker CLI is necessary only if you build/test containers inside Jenkins.
RUN apt-get update && \
    apt-get install -y docker.io && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
