pipeline {
    agent any
    environment {
        IMAGE_NAME = 'aerosibin/canary-api'
        TAG = "${env.BUILD_ID}"
    }
    stages {
        stage('Build Image') {
            steps {
                bat 'docker build -t %IMAGE_NAME%:%TAG% .'
            }
        }

        stage('Initialize Stable Environment') {
            steps {
                // Starts Nginx and the REAL application as the baseline
                bat '''
                    docker network inspect app-network >nul 2>&1 || docker network create app-network
                    docker ps --format "{{.Names}}" | findstr "nginx-router" >nul 2>&1 || docker run -d --name nginx-router -p 8000:80 --network app-network nginx:alpine
                    docker ps --format "{{.Names}}" | findstr "node-stable" >nul 2>&1 || docker run -d --name node-stable --network app-network -e APP_VERSION=v1-stable %IMAGE_NAME%:%TAG%
                '''
            }
        }

        stage('Deploy Canary') {
            steps {
                bat '''
                    docker rm -f node-canary >nul 2>&1 || true
                    docker run -d --name node-canary --network app-network -e APP_VERSION=v2-canary %IMAGE_NAME%:%TAG%
                '''
            }
        }

        stage('Shift 10% Traffic to Canary') {
            steps {
                script {
                    def canaryConfig = """
                    events {}
                    http {
                        upstream backend {
                            server node-stable:3000 weight=9;
                            server node-canary:3000 weight=1;
                        }
                        server {
                            listen 80;
                            location / {
                                proxy_pass http://backend;
                            }
                        }
                    }
                    """
                    writeFile file: 'nginx.conf', text: canaryConfig
                }
                bat '''
                    docker cp nginx.conf nginx-router:/etc/nginx/nginx.conf
                    docker exec nginx-router nginx -s reload
                '''
            }
        }

        stage('Promote Canary to Stable') {
            steps {
                input message: 'Canary looks healthy. Promote to 100% traffic?'
                
                script {
                    def stableConfig = """
                    events {}
                    http {
                        upstream backend {
                            server node-stable:3000 weight=10;
                        }
                        server {
                            listen 80;
                            location / {
                                proxy_pass http://backend;
                            }
                        }
                    }
                    """
                    writeFile file: 'nginx-stable.conf', text: stableConfig
                }
                
                bat '''
                    docker rm -f node-stable
                    docker rename node-canary node-stable
                    docker cp nginx-stable.conf nginx-router:/etc/nginx/nginx.conf
                    docker exec nginx-router nginx -s reload
                '''
            }
        }
    }
}