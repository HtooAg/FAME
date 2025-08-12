# Google Cloud Storage & Real-Time Notifications Implementation

## Overview

This implementation replaces local data storage with Google Cloud Storage and adds real-time notifications using WebSocket connections.

## 🚀 Key Features Implemented

### 1. Google Cloud Storage Integration

-   **Bucket**: `fame-data`
-   **Organized folder structure**:

    ```
    artists/[artistId]/
      ├── profile.json
      ├── technical.json
      ├── social.json
      ├── notes.json
      ├── music.json
      └── gallery.json

    events/[eventId]/
      └── artists/[artistId].json
    ```

### 2. Real-Time Notifications System

-   **WebSocket-based notifications** for all user roles
-   **Notification types**:
    -   Artist registration
    -   Status updates
    -   Profile updates
    -   Event creation
    -   Rehearsal scheduling

### 3. User Role-Based Notifications

-   **Super Admin**: Receives all notifications
-   **Stage Manager**: Receives artist and event notifications
-   **Artist**: Receives status updates and rehearsal notifications

## 📁 Files Created/Modified

### New Files

-   `lib/google-cloud-storage.ts` - GCS service with local fallback
-   `lib/websocket-service.ts` - Real-time notification service
-   `components/NotificationProvider.tsx` - Notification UI component
-   `app/gcs-local/[...path]/route.ts` - Local file serving for development
-   `.env.example` - Environment variables template

### Modified Files

-   `app/api/events/[eventId]/artists/route.ts` - Updated to use GCS
-   `app/api/artists/profile/route.ts` - Updated to use GCS
-   `app/artist-dashboard/page.tsx` - Added notifications
-   `app/stage-manager/events/[eventId]/artists/page.tsx` - Added notifications

## 🔧 Configuration

### Environment Variables

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
JWT_SECRET=your-jwt-secret-key
```

### Development Mode

-   Uses local storage fallback when GCS credentials are not configured
-   Files stored in `gcs-local-storage/` directory
-   Accessible via `/gcs-local/[...path]` routes

## 🌐 Real-Time Features

### Notification Bell Component

-   Shows unread notification count
-   Real-time connection status indicator
-   Notification history with timestamps
-   Mark as read/clear all functionality

### Refresh Button

-   Manual data refresh capability
-   Handles WebSocket connection failures
-   Provides fallback when real-time updates fail

### Auto-Refresh

-   Automatic data updates via WebSocket
-   No manual page refresh needed
-   Toast notifications for new updates

## 📊 Data Storage Structure

### Artist Data Organization

Each artist's data is split into logical JSON files:

1. **profile.json** - Basic information
2. **technical.json** - Costume, lighting, stage positioning
3. **social.json** - Social media links and demo videos
4. **notes.json** - MC notes, stage manager notes
5. **music.json** - Music track metadata
6. **gallery.json** - Image/video gallery metadata

### File Storage

-   Music files: `artists/[artistId]/music/[filename]`
-   Gallery files: `artists/[artistId]/gallery/[filename]`
-   Proper MIME type handling for all file types

## 🔄 Real-Time Notification Flow

1. **Artist Registration**:

    - Artist submits form → Data saved to GCS → Notification sent to Stage Managers & Super Admins

2. **Status Updates**:

    - Stage Manager updates status → Data updated in GCS → Notification sent to all relevant parties

3. **Profile Updates**:
    - Artist updates profile → Data saved to GCS → Notification sent to Stage Managers

## 🎯 Benefits

### For Artists

-   ✅ Real-time status updates
-   ✅ Comprehensive dashboard with all data
-   ✅ Export functionality for personal records
-   ✅ Instant notifications for important updates

### For Stage Managers

-   ✅ Real-time artist registration notifications
-   ✅ Automatic data refresh without page reload
-   ✅ Organized data structure for easy management
-   ✅ Instant status update notifications

### For Super Admins

-   ✅ Complete system oversight with notifications
-   ✅ Real-time monitoring of all activities
-   ✅ Centralized data management in cloud storage

## 🔒 Security & Reliability

-   **Private file storage** with signed URLs
-   **Role-based notification filtering**
-   **Fallback mechanisms** for offline scenarios
-   **Data integrity** with structured JSON storage
-   **Connection status monitoring** with reconnection logic

## 🚀 Production Deployment

### Google Cloud Storage Setup

1. Create GCS bucket named `fame-data`
2. Set up service account with Storage Admin permissions
3. Download service account key JSON file
4. Set environment variables in production

### WebSocket Configuration

-   Configure WebSocket server for production
-   Set up proper CORS and authentication
-   Implement connection pooling for scalability

## 📈 Scalability Features

-   **Organized folder structure** for efficient data retrieval
-   **Separate JSON files** for different data types
-   **Efficient notification routing** based on user roles
-   **Connection management** with automatic cleanup
-   **File serving optimization** with proper caching headers

This implementation provides a robust, scalable, and real-time data management system that eliminates the need for manual page refreshes while ensuring all data is properly stored in Google Cloud Storage with organized folder structures.
