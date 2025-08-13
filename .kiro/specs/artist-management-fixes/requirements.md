# Requirements Document

## Introduction

This feature addresses critical issues in the artist management system including real-time WebSocket notifications for artist submissions, proper media file handling to fix blob URL errors, complete artist data display in management interfaces, and the workflow for assigning artists to rehearsal days. The improvements will ensure stage managers receive immediate notifications when artists submit their information, can properly view and play uploaded media files, and can assign artists to specific performance dates.

## Requirements

### Requirement 1: Real-time Artist Submission Notifications

**User Story:** As a stage manager, I want to receive real-time notifications when artists submit their registration information, so that I can immediately review and process new applications.

#### Acceptance Criteria

1. WHEN an artist completes their registration THEN the system SHALL send a real-time WebSocket notification to all connected stage managers
2. WHEN a stage manager is viewing the artist management page THEN the system SHALL display new artist submissions immediately without page refresh
3. WHEN an artist submission notification is received THEN the system SHALL show a notification badge and update the submitted applications table
4. WHEN the WebSocket connection is established THEN the system SHALL authenticate the stage manager and subscribe to artist submission events
5. WHEN multiple artists submit simultaneously THEN the system SHALL handle all notifications without data loss or UI conflicts

### Requirement 2: Media File Display and Playback Fix

**User Story:** As a stage manager, I want to properly view and play artist-uploaded media files (videos, MP3s, images), so that I can evaluate their performance materials and make informed decisions.

#### Acceptance Criteria

1. WHEN viewing an artist's profile THEN the system SHALL display all uploaded media files with proper URLs that are not blob URLs
2. WHEN clicking on a video file THEN the system SHALL play the video using proper signed URLs from Google Cloud Storage
3. WHEN clicking on an audio file THEN the system SHALL play the MP3 using proper signed URLs with working audio controls
4. WHEN viewing gallery images THEN the system SHALL display images using proper signed URLs that load correctly
5. WHEN media files are accessed THEN the system SHALL generate fresh signed URLs with appropriate expiration times

### Requirement 3: Complete Artist Data Integration

**User Story:** As a stage manager, I want to see all artist registration data including colors, technical requirements, and media files in the artist management interface, so that I have complete information for decision making.

#### Acceptance Criteria

1. WHEN viewing the artist management page THEN the system SHALL fetch and display all artist data from Google Cloud Storage folders
2. WHEN viewing an artist's details THEN the system SHALL show costume colors, lighting preferences, stage positioning, and technical requirements
3. WHEN viewing artist profiles THEN the system SHALL display social media links, biography, and performance notes
4. WHEN accessing artist music tracks THEN the system SHALL show song titles, durations, tempo, and DJ notes with playable audio
5. WHEN viewing artist gallery THEN the system SHALL display all uploaded images and videos with proper thumbnails and playback

### Requirement 4: Artist Assignment to Rehearsal Days

**User Story:** As a stage manager, I want to assign artists to specific rehearsal/performance days, so that only assigned artists appear in the rehearsal calendar and can perform.

#### Acceptance Criteria

1. WHEN viewing submitted artists THEN the system SHALL provide dropdown options to assign them to available show dates
2. WHEN an artist is assigned to a performance date THEN the system SHALL move them from "Submitted Applications" to "Assigned Artists" section
3. WHEN an artist is assigned THEN the system SHALL update their status in Google Cloud Storage and make them available for rehearsal scheduling
4. WHEN an artist is not assigned to any show day THEN the system SHALL prevent them from appearing in rehearsal calendars
5. WHEN reassigning an artist THEN the system SHALL update their performance date and reflect changes immediately in the UI

### Requirement 5: Artist Management UI Consistency

**User Story:** As a stage manager, I want the artist management interface to follow the exact UI pattern from the sample-ui/ArtistManagement.tsx, so that I have a familiar and consistent user experience.

#### Acceptance Criteria

1. WHEN accessing artist management THEN the system SHALL display the interface matching the sample UI layout and functionality
2. WHEN viewing artist tables THEN the system SHALL show the same columns, actions, and styling as the sample implementation
3. WHEN using artist management features THEN the system SHALL provide the same dialogs, forms, and interactions as the sample
4. WHEN managing artists THEN the system SHALL include all features from the sample: view, assign, unassign, delete, and manual creation
5. WHEN displaying artist information THEN the system SHALL format data consistently with the sample UI patterns

### Requirement 6: Google Cloud Storage File Access Fix

**User Story:** As a system administrator, I want the media file storage and retrieval system to work properly with Google Cloud Storage, so that artists and stage managers can access uploaded files without errors.

#### Acceptance Criteria

1. WHEN files are uploaded THEN the system SHALL store them in Google Cloud Storage with proper file paths and metadata
2. WHEN files are accessed THEN the system SHALL generate signed URLs that are valid and accessible
3. WHEN signed URLs expire THEN the system SHALL automatically generate new ones for continued access
4. WHEN file types are detected THEN the system SHALL properly identify and handle images, videos, and audio files
5. WHEN blob URLs are encountered THEN the system SHALL replace them with proper signed URLs from Google Cloud Storage

### Requirement 7: WebSocket Integration for Artist Management

**User Story:** As a stage manager, I want the artist management system to use WebSocket connections for real-time updates, so that I see changes immediately without manual refresh.

#### Acceptance Criteria

1. WHEN the artist management page loads THEN the system SHALL establish a WebSocket connection for real-time updates
2. WHEN artist data changes THEN the system SHALL broadcast updates to all connected stage managers viewing the management interface
3. WHEN artists are assigned or unassigned THEN the system SHALL send real-time updates to update the UI immediately
4. WHEN the WebSocket connection is lost THEN the system SHALL attempt to reconnect automatically with exponential backoff
5. WHEN WebSocket messages are received THEN the system SHALL update the appropriate UI components without full page refresh

### Requirement 8: Artist Profile Data Completeness

**User Story:** As a stage manager, I want to see all the data that artists submitted during registration, so that I can make informed decisions about their applications.

#### Acceptance Criteria

1. WHEN viewing artist profiles THEN the system SHALL display all form fields that were collected during registration
2. WHEN accessing technical requirements THEN the system SHALL show costume colors, lighting preferences, and stage positioning
3. WHEN viewing performance details THEN the system SHALL display performance type, duration, style, and special requirements
4. WHEN checking artist media THEN the system SHALL show all uploaded music tracks with metadata and playable audio
5. WHEN reviewing artist information THEN the system SHALL display social media links, biography, and contact information

### Requirement 9: Error Handling for Media Files

**User Story:** As a user, I want the system to handle media file errors gracefully, so that I receive clear feedback when files cannot be loaded or played.

#### Acceptance Criteria

1. WHEN a media file cannot be loaded THEN the system SHALL display a clear error message with retry options
2. WHEN signed URL generation fails THEN the system SHALL log the error and show a user-friendly message
3. WHEN audio/video playback fails THEN the system SHALL provide alternative access methods or download options
4. WHEN file formats are unsupported THEN the system SHALL display appropriate format information and suggestions
5. WHEN network errors occur THEN the system SHALL provide retry mechanisms and offline indicators

### Requirement 10: Performance Optimization for Media Handling

**User Story:** As a user, I want media files to load quickly and efficiently, so that I can review artist materials without delays.

#### Acceptance Criteria

1. WHEN loading artist profiles THEN the system SHALL lazy-load media files to improve initial page load times
2. WHEN generating signed URLs THEN the system SHALL cache them appropriately to reduce repeated GCS calls
3. WHEN displaying multiple media files THEN the system SHALL implement progressive loading and thumbnails
4. WHEN playing audio/video THEN the system SHALL use efficient streaming methods to minimize bandwidth usage
5. WHEN accessing frequently viewed files THEN the system SHALL implement appropriate caching strategies
