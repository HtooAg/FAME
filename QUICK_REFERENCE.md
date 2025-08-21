# FAME Application - Quick Reference Guide

## 🚀 Quick Deploy Commands

### One-Line Deploy

```bash
gcloud builds submit --tag gcr.io/fame-468308/fame-app . && gcloud run deploy fame-app --image gcr.io/fame-468308/fame-app --platform managed --region us-central1 --allow-unauthenticated --port 8080 --memory 2Gi --cpu 2 --timeout 300
```

### Build Only

```bash
gcloud builds submit --tag gcr.io/fame-468308/fame-app .
```

### Deploy Only

```bash
gcloud run deploy fame-app --image gcr.io/fame-468308/fame-app --region us-central1
```

## 🔍 Health Check Commands

### Storage Health

```bash
curl https://fame-app-952527217966.us-central1.run.app/api/health/storage
```

### Security Status

```bash
curl https://fame-app-952527217966.us-central1.run.app/api/admin/security
```

### Test Authentication

```bash
# Test Registration
curl -X POST https://fame-app-952527217966.us-central1.run.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPassword123!","eventName":"Test Event"}'

# Test Login
curl -X POST https://fame-app-952527217966.us-central1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

## 📊 Monitoring Commands

### View Logs

```bash
# Recent logs
gcloud run services logs read fame-app --region=us-central1 --limit=20

# Follow logs
gcloud run services logs tail fame-app --region=us-central1

# Error logs only
gcloud run services logs read fame-app --region=us-central1 --filter="severity>=ERROR"
```

### Service Status

```bash
# Service details
gcloud run services describe fame-app --region=us-central1

# Get service URL
gcloud run services describe fame-app --region=us-central1 --format="value(status.url)"

# List revisions
gcloud run revisions list --service=fame-app --region=us-central1
```

## 🗄️ Storage Commands

### Check GCS Bucket

```bash
# List bucket contents
gcloud storage ls gs://fame-data/

# List user registrations
gcloud storage ls gs://fame-data/registrations/stage-managers/

# Check counters
gcloud storage ls gs://fame-data/counters/
```

### Backup Data

```bash
# Create backup
gcloud storage cp -r gs://fame-data gs://fame-data-backup-$(date +%Y%m%d)

# List backups
gcloud storage ls gs://fame-data-backup-*
```

## 🔧 Troubleshooting Commands

### Build Issues

```bash
# Check build history
gcloud builds list --limit=5

# Get build logs
gcloud builds log [BUILD_ID]

# Force clean build
gcloud builds submit --tag gcr.io/fame-468308/fame-app . --no-cache
```

### Rollback

```bash
# List revisions
gcloud run revisions list --service=fame-app --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic fame-app --to-revisions=[REVISION_NAME]=100 --region=us-central1
```

### Environment Variables

```bash
# Update environment variable
gcloud run services update fame-app --set-env-vars="JWT_SECRET=new-secret" --region=us-central1

# Remove environment variable
gcloud run services update fame-app --remove-env-vars="OLD_VAR" --region=us-central1
```

## 🔒 Security Quick Checks

### Password Requirements

-   Minimum 8 characters
-   At least one uppercase letter (A-Z)
-   At least one lowercase letter (a-z)
-   At least one number (0-9)
-   At least one special character (!@#$%^&\*)

### JWT Secret Requirements

-   Minimum 32 characters
-   Include uppercase, lowercase, numbers, special characters
-   Example: `MySecureJWT2024!@#$%^&*()_+{}`

### Security Score Targets

-   **Good**: 80-100%
-   **Warning**: 60-79%
-   **Critical**: Below 60%

## 📱 API Endpoints

### Public Endpoints

-   `GET /` - Home page
-   `GET /login` - Login page
-   `GET /register` - Registration page
-   `POST /api/auth/login` - User login
-   `POST /api/auth/register` - User registration

### Health & Admin Endpoints

-   `GET /api/health/storage` - Storage health check
-   `GET /api/admin/security` - Security status
-   `POST /api/admin/sync` - Trigger data sync

### Authentication Headers

```bash
# For authenticated requests
-H "Authorization: Bearer [JWT_TOKEN]"
# or cookie-based (automatic in browser)
```

## 🚨 Emergency Procedures

### Service Down

1. Check logs: `gcloud run services logs read fame-app --region=us-central1 --limit=10`
2. Check health: `curl https://fame-app-952527217966.us-central1.run.app/api/health/storage`
3. Rollback if needed: Use rollback commands above

### Storage Issues

1. Check GCS: `gcloud storage ls gs://fame-data/`
2. Verify permissions: `gcloud projects get-iam-policy fame-468308`
3. Check local fallback in logs

### Build Failures

1. Check build logs: `gcloud builds list --limit=1`
2. Try clean build: `gcloud builds submit --tag gcr.io/fame-468308/fame-app . --no-cache`
3. Check Docker context: Verify `.dockerignore`

## 📞 Important URLs

-   **Production App**: https://fame-app-952527217966.us-central1.run.app
-   **Cloud Console**: https://console.cloud.google.com/run/detail/us-central1/fame-app/metrics?project=fame-468308
-   **Build History**: https://console.cloud.google.com/cloud-build/builds?project=fame-468308
-   **Storage Browser**: https://console.cloud.google.com/storage/browser/fame-data?project=fame-468308

## 🔑 Key Configuration

### Project Details

-   **Project ID**: fame-468308
-   **Service Name**: fame-app
-   **Region**: us-central1
-   **Bucket**: fame-data
-   **Image**: gcr.io/fame-468308/fame-app

### Resource Limits

-   **Memory**: 2Gi
-   **CPU**: 2 cores
-   **Timeout**: 300 seconds
-   **Port**: 8080

---

**Quick Reference Version**: 1.0  
**Last Updated**: August 17, 2025
