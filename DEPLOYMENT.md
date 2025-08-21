# FAME Application - Deployment & Hosting Guide

## 🚀 Overview

The FAME (Festival Artist Management & Events) application is a Next.js-based web application deployed on Google Cloud Run using Docker containers. This document provides comprehensive instructions for deployment, maintenance, and troubleshooting.

## 📋 Table of Contents

-   [Architecture Overview](#architecture-overview)
-   [Prerequisites](#prerequisites)
-   [Environment Configuration](#environment-configuration)
-   [Docker Configuration](#docker-configuration)
-   [Deployment Process](#deployment-process)
-   [Monitoring & Health Checks](#monitoring--health-checks)
-   [Troubleshooting](#troubleshooting)
-   [Security Considerations](#security-considerations)
-   [Maintenance Tasks](#maintenance-tasks)

## 🏗️ Architecture Overview

### Application Stack

-   **Frontend**: Next.js 14.2.16 with React
-   **Backend**: Next.js API Routes
-   **Database**: Google Cloud Storage (with local file fallback)
-   **Authentication**: JWT with HTTP-only cookies
-   **Container**: Docker with Alpine Linux
-   **Hosting**: Google Cloud Run
-   **Build**: Google Cloud Build

### Storage Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│  Storage Manager │───▶│ Google Cloud    │
│                 │    │                  │    │ Storage         │
└─────────────────┘    │                  │    │ (fame-data)     │
                       │                  │    └─────────────────┘
                       │                  │           │
                       │                  │           │ Fallback
                       │                  │           ▼
                       │                  │    ┌─────────────────┐
                       │                  │───▶│ Local File      │
                       │                  │    │ Storage         │
                       └──────────────────┘    │ (/app/data)     │
                                               └─────────────────┘
```

## 📋 Prerequisites

### Required Tools

-   Google Cloud SDK (`gcloud`)
-   Docker (for local testing)
-   Node.js 18+ (for local development)
-   Git

### Google Cloud Setup

1. **Project**: `fame-468308`
2. **Region**: `us-central1`
3. **Services Enabled**:
    - Cloud Run
    - Cloud Build
    - Container Registry
    - Cloud Storage

### Required Permissions

-   Cloud Run Admin
-   Cloud Build Editor
-   Storage Admin
-   Container Registry Admin

## ⚙️ Environment Configuration

### Production Environment Variables

Create or update `.env` file:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=fame-468308
GOOGLE_CLOUD_BUCKET_NAME=fame-data
GOOGLE_CLOUD_KEY_FILE=./gcs_key.json

# Security Configuration
JWT_SECRET=your-strong-secret-32-chars-minimum-with-mixed-case-123!
BCRYPT_ROUNDS=12
NODE_ENV=production

# Storage Configuration (Optional)
LOCAL_DATA_PATH=/app/data
GCS_TIMEOUT=10000
STORAGE_SYNC_ENABLED=true

# Logging Configuration (Optional)
LOG_LEVEL=INFO
```

### Security Requirements

#### JWT Secret

-   **Minimum**: 32 characters
-   **Must include**: Uppercase, lowercase, numbers, special characters
-   **Example**: `MySecureJWT2024!@#$%^&*()_+{}[]`

#### BCRYPT Rounds

-   **Development**: 10 (minimum)
-   **Production**: 12+ (recommended)

## 🐳 Docker Configuration

### Dockerfile Structure

The application uses a multi-stage Docker build:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
# Install dependencies

# Stage 2: Builder
FROM base AS builder
# Build the application

# Stage 3: Runner (Production)
FROM base AS runner
# Copy built application and run
```

### Key Docker Features

-   **Multi-stage build** for optimized image size
-   **Non-root user** (`nextjs:nodejs`) for security
-   **Data directory** with proper permissions (`/app/data`)
-   **Alpine Linux** for minimal attack surface

### Build Context

Files included in Docker build (see `.dockerignore`):

-   Application source code
-   `package.json` and `package-lock.json`
-   Environment configuration
-   Google Cloud service account key

## 🚀 Deployment Process

### 1. Pre-deployment Checklist

-   [ ] Environment variables configured
-   [ ] Google Cloud authentication set up
-   [ ] Service account key file present
-   [ ] Code changes committed and tested

### 2. Build and Deploy Commands

#### Quick Deployment (Recommended)

```bash
# Build and deploy in one command
gcloud auth login ericlaltaevents@gmail.com
gcloud config set project fame-468308
gcloud builds submit --tag gcr.io/fame-468308/fame-app . && \
gcloud run deploy fame-app \
  --image gcr.io/fame-468308/fame-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

#### Step-by-step Deployment

```bash
# 1. Build the container image
gcloud builds submit --tag gcr.io/fame-468308/fame-app .

# 2. Deploy to Cloud Run
gcloud run deploy fame-app \
  --image gcr.io/fame-468308/fame-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

### 3. Deployment Configuration

| Parameter   | Value         | Description                 |
| ----------- | ------------- | --------------------------- |
| `--memory`  | `2Gi`         | Memory allocation           |
| `--cpu`     | `2`           | CPU allocation              |
| `--timeout` | `300`         | Request timeout (5 minutes) |
| `--port`    | `8080`        | Container port              |
| `--region`  | `us-central1` | Deployment region           |

### 4. Post-deployment Verification

```bash
# Check deployment status
gcloud run services describe fame-app --region=us-central1

# Get service URL
gcloud run services describe fame-app --region=us-central1 --format="value(status.url)"

# Test health endpoint
curl https://fame-app-952527217966.us-central1.run.app/api/health/storage
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

#### Storage Health

```bash
GET /api/health/storage
```

**Response:**

```json
{
	"status": "healthy",
	"timestamp": "2025-08-17T08:15:13.211Z",
	"storage": {
		"gcs": {
			"available": true,
			"lastCheck": "2025-08-17T08:15:13.200Z"
		},
		"local": {
			"available": true,
			"path": "/app/data"
		},
		"fallbackActive": false
	},
	"services": {
		"authentication": true,
		"registration": true
	}
}
```

#### Security Status

```bash
GET /api/admin/security
```

**Response:**

```json
{
  "overall": {
    "score": 80,
    "status": "good",
    "lastChecked": "2025-08-17T08:15:13.211Z"
  },
  "checks": [...],
  "recommendations": [...]
}
```

### Log Monitoring

```bash
# View recent logs
gcloud run services logs read fame-app --region=us-central1 --limit=50

# Follow logs in real-time
gcloud run services logs tail fame-app --region=us-central1

# Filter error logs
gcloud run services logs read fame-app --region=us-central1 --filter="severity>=ERROR"
```

### Key Metrics to Monitor

1. **Response Time**: < 2 seconds for API calls
2. **Error Rate**: < 1% for authentication endpoints
3. **Memory Usage**: < 1.5Gi under normal load
4. **Storage Health**: Both GCS and local should be available
5. **Security Score**: Should be > 80%

## 🔧 Troubleshooting

### Common Issues

#### 1. Authentication Errors (500 Internal Server Error)

**Symptoms:**

-   Registration/login returns 500 error
-   Logs show "Storage initialization failed"

**Solution:**

```bash

# Check logs for specific error
gcloud run services logs read fame-app --region=us-central1 --limit=20
```

**Common Causes:**

-   Missing data directory permissions
-   GCS authentication issues
-   Invalid environment variables

#### 2. Validation Errors (400 Bad Request)

**Symptoms:**

-   Registration fails with validation messages
-   Password requirements not met

**Expected Behavior:**

```json
{
	"error": true,
	"message": "Validation failed: password must be at least 8 characters long",
	"type": "validation_error"
}
```

**Password Requirements:**

-   Minimum 8 characters
-   At least one uppercase letter
-   At least one lowercase letter
-   At least one number
-   At least one special character

#### 3. Build Failures

**Common Issues:**

-   Missing dependencies in `package.json`
-   TypeScript compilation errors
-   Docker build context issues

**Debug Commands:**

```bash
# Check build logs
gcloud builds log [BUILD_ID]

# Local build test
docker build -t fame-app-test .
```

#### 4. Storage Issues

**GCS Connection Problems:**

```bash
# Test GCS access
gcloud storage ls gs://fame-data/

# Check service account permissions
gcloud projects get-iam-policy fame-468308
```

**Local Storage Problems:**

-   Check container permissions
-   Verify `/app/data` directory exists
-   Check disk space

### Emergency Procedures

#### Rollback Deployment

```bash
# List recent revisions
gcloud run revisions list --service=fame-app --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic fame-app \
  --to-revisions=[PREVIOUS_REVISION]=100 \
  --region=us-central1
```

#### Force Rebuild

```bash
# Clean build (no cache)
gcloud builds submit --tag gcr.io/fame-468308/fame-app . --no-cache

# Redeploy with new image
gcloud run deploy fame-app --image gcr.io/fame-468308/fame-app --region=us-central1
```

## 🔒 Security Considerations

### Authentication Security

-   JWT tokens expire in 7 days
-   HTTP-only cookies prevent XSS
-   Rate limiting: 5 attempts per 15 minutes
-   Password hashing with bcrypt (12 rounds)

### Container Security

-   Non-root user execution
-   Minimal Alpine Linux base image
-   Security headers applied to all responses
-   Input validation and sanitization

### Data Security

-   Data stored in Google Cloud Storage (`fame-data` bucket)
-   Local fallback with secure file permissions (600)
-   Automatic data synchronization
-   Audit logging for all operations

### Network Security

-   HTTPS enforced in production
-   CORS policies configured
-   Security headers (CSP, HSTS, etc.)
-   Request timeout limits

## 🔄 Maintenance Tasks

### Regular Maintenance

#### Weekly Tasks

-   [ ] Review application logs for errors
-   [ ] Check security status endpoint
-   [ ] Verify storage health
-   [ ] Monitor resource usage

#### Monthly Tasks

-   [ ] Update dependencies (`npm audit`)
-   [ ] Review security configurations
-   [ ] Clean up old container images
-   [ ] Backup critical data

#### Quarterly Tasks

-   [ ] Security audit
-   [ ] Performance optimization review
-   [ ] Disaster recovery testing
-   [ ] Documentation updates

### Update Procedures

#### Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit fix

# Test and deploy
npm run build && [deploy commands]
```

#### Environment Updates

```bash
# Update environment variables
gcloud run services update fame-app \
  --set-env-vars="NEW_VAR=value" \
  --region=us-central1
```

### Backup Procedures

#### Data Backup

```bash
# Backup GCS bucket
gcloud storage cp -r gs://fame-data gs://fame-data-backup-$(date +%Y%m%d)

# List backups
gcloud storage ls gs://fame-data-backup-*
```

#### Configuration Backup

-   Environment variables
-   Service account keys
-   Deployment configurations
-   Docker configurations

## 📞 Support Information

### Google Cloud Resources

-   **Project ID**: `fame-468308`
-   **Service Name**: `fame-app`
-   **Region**: `us-central1`
-   **Storage Bucket**: `fame-data`
-   **Container Registry**: `gcr.io/fame-468308/fame-app`

### Key Files

-   `Dockerfile` - Container configuration
-   `.env` - Environment variables
-   `gcs_key.json` - Service account key
-   `.dockerignore` - Build context exclusions

### Emergency Contacts

-   **Cloud Console**: https://console.cloud.google.com/run/detail/us-central1/fame-app/metrics?project=fame-468308
-   **Build History**: https://console.cloud.google.com/cloud-build/builds?project=fame-468308
-   **Storage Console**: https://console.cloud.google.com/storage/browser/fame-data?project=fame-468308

---

## 📝 Change Log

| Date       | Version | Changes                                       |
| ---------- | ------- | --------------------------------------------- |
| 2025-08-17 | 1.0.0   | Initial deployment with authentication system |
| 2025-08-17 | 1.1.0   | Added storage fallback mechanism              |
| 2025-08-17 | 1.2.0   | Enhanced security and validation              |
| 2025-08-17 | 1.3.0   | Fixed error handling and user feedback        |

---

**Last Updated**: August 17, 2025  
**Document Version**: 1.3.0  
**Application Version**: 1.3.0
