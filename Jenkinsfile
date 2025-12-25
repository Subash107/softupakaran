pipeline {
  agent {
    docker {
      image 'softupakaran/jenkins-agent:latest'
      label 'docker'
      args '-v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  environment {
    TF_TOKEN_app_terraform_io = credentials('tfc-token')
    TF_VAR_render_api_key     = credentials('render-api-key')
  }

  stages {
    stage('Backend Build') {
      steps {
        dir('services/backend') {
          sh 'npm install'
          sh 'npm run build'
        }
      }
    }

    stage('Frontend Build') {
      steps {
        dir('services/frontend') {
          sh 'npm install'
          sh 'npm run build'
        }
      }
    }

    stage('Terraform Plan') {
      steps {
        dir('infrastructure/terraform') {
          sh 'terraform init -reconfigure'
          sh 'terraform plan'
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'services/frontend/build/**, services/backend/dist/**', allowEmptyArchive: true
    }
  }
}
