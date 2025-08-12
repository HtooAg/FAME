# Design Document

## Overview

This design document outlines the technical implementation for improving the artist dashboard routing system, implementing real-time data updates in the super admin interface, and adding a comprehensive notification system. The solution leverages the existing Next.js App Router architecture, WebSocket infrastructure, and Google Cloud Storage integration while introducing dynamic routing and real-time communication patterns.

The improvements focus on three main areas: dynamic artist dashboard routing with ID-based URLs, WebSocket integration for real-time super admin updates, and a notification system that works across all user roles.

## Architecture

### System Architecture Overview

```mermaid
graph TB
    A[Artist Registration] --> B[Artist Dashboard /artist-dashboard/[id]]
    B --> C[GCS Artist Data]
    D[Super Admin Dashboard] --> E[WebSocket Connection]
    E --> F[Real-time Updates]
    F --> G[Artist Data Changes]
    F --> H[Stage Manager Changes]
    I[Notification System] --> J[WebSocket Notifications]
    J --> K[Real-time Notification Updates]
    C --> L[GCS Artists Folders]
    L --> M[Individual Artist Files]
```

### Technology Stack

-   **Frontend Framework**: Next.js 14 with App Router
-   **Real-time Communication**: WebSocket (existing infrastructure)
-   **Data Storage**: Google Cloud Storage (existing GCS integration)
-   **State Management**: React Context + WebSocket state
-   **UI Components**: Existing Radix UI components
-   **Authentication**: Existing JWT-based authentication

### Directory Structure Changes

```
app/
├── artist-dashboard/
│   └── [artistId]/
│       └── page.tsx (New dynamic route)
├── super-admin/
│   └── page.tsx (Enhanced with WebSocket)
├── api/
│   ├── artists/
│   │   └── [artistId]/
│   │       └── route.ts (Enhanced)
│   ├── super-admin/
│   │   ├── artists/
│   │   │   └── route.ts (New)
│   │   └── websocket/
│   │       └── route.ts (Enhanced)
│   └── notifications/
│       └── route.ts (New)
components/
├── NotificationProvider.tsx (Enhanced)
├── WebSocketProvider.tsx (New)
└── ui/
    └── notification-bell.tsx (New)
```

## Components and Interfaces

### 1. Dynamic Artist Dashboard

#### Artist Dashboard Route (`app/artist-dashboard/[artistId]/page.tsx`)

```typescript
interface ArtistDashboardProps {
	params: {
		artistId: string;
	};
}

interface ArtistProfile {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	eventId: string;
	eventName: string;
	status: "pending" | "approved" | "active" | "inactive";
	createdAt: string;
	musicTracks: MusicTrack[];
	galleryFiles: GalleryFile[];
	socialMedia: SocialMediaLinks;
	technicalRequirements: TechnicalRequirements;
}
```

#### Artist API Enhancement (`app/api/artists/[artistId]/route.ts`)

```typescript
// GET /api/artists/[artistId]
export async function GET(
	request: NextRequest,
	{ params }: { params: { artistId: string } }
) {
	try {
		const artistData = await readJsonFile<ArtistProfile>(
			`artists/${params.artistId}/profile.json`
		);
		return NextResponse.json({ success: true, data: artistData });
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: "Artist not found" },
			{ status: 404 }
		);
	}
}
```

### 2. WebSocket Integration for Super Admin

#### WebSocket Provider Component

```typescript
interface WebSocketContextType {
	isConnected: boolean;
	lastMessage: any;
	sendMessage: (message: any) => void;
	connectionStatus: "connecting" | "connected" | "disconnected" | "error";
}

const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [socket, setSocket] = useState<WebSocket | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<any>(null);
	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "connected" | "disconnected" | "error"
	>("disconnected");

	// WebSocket connection logic with auto-reconnect
	// Authentication handling
	// Message broadcasting
};
```

#### Enhanced Super Admin Dashboard

```typescript
interface SuperAdminData {
	pendingRegistrations: StageManagerRegistration[];
	activeStageManagers: User[];
	suspendedStageManagers: User[];
	allStageManagers: User[];
	allArtists: Artist[];
	totalArtists: number;
	statistics: {
		pendingCount: number;
		activeCount: number;
		suspendedCount: number;
		totalStageManagers: number;
		totalArtists: number;
	};
}

const SuperAdminPage = () => {
	const { isConnected, lastMessage } = useWebSocket();
	const [data, setData] = useState<SuperAdminData | null>(null);
	const [realTimeUpdates, setRealTimeUpdates] = useState(true);

	// Real-time data handling
	// WebSocket message processing
	// Auto-refresh logic
};
```

### 3. Notification System

#### Notification Bell Component

```typescript
interface Notification {
	id: string;
	type: "info" | "success" | "warning" | "error";
	title: string;
	message: string;
	timestamp: string;
	read: boolean;
	userId: string;
	userRole: string;
}

interface NotificationBellProps {
	userRole: "artist" | "stage_manager" | "super_admin";
	userId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
	userRole,
	userId,
}) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);

	// Notification fetching
	// Real-time notification updates
	// Mark as read functionality
};
```

#### Notification API (`app/api/notifications/route.ts`)

```typescript
// GET /api/notifications?userId=&role=
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const userId = searchParams.get("userId");
	const role = searchParams.get("role");

	try {
		const notifications = await readJsonFile<Notification[]>(
			`notifications/${role}/${userId}.json`,
			[]
		);
		return NextResponse.json({ success: true, data: notifications });
	} catch (error) {
		return NextResponse.json({ success: true, data: [] });
	}
}

// POST /api/notifications (mark as read)
export async function POST(request: NextRequest) {
	const { notificationIds, userId, role } = await request.json();

	// Mark notifications as read
	// Update GCS storage
	// Broadcast update via WebSocket
}
```

## Data Models

### Enhanced Artist Model

```typescript
interface Artist {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	eventId: string;
	eventName: string;
	status: "pending" | "approved" | "active" | "inactive";
	createdAt: string;
	updatedAt: string;
	lastLogin?: string;
	musicTracks: MusicTrack[];
	galleryFiles: GalleryFile[];
	socialMedia: SocialMediaLinks;
	technicalRequirements: TechnicalRequirements;
}

interface MusicTrack {
	song_title: string;
	duration: number;
	notes: string;
	is_main_track: boolean;
	tempo: string;
	file_url: string;
}

interface TechnicalRequirements {
	costumeColor: string;
	customCostumeColor?: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition?: string;
	mcNotes: string;
	stageManagerNotes: string;
}
```

### WebSocket Message Types

```typescript
interface WebSocketMessage {
	type:
		| "artist_registered"
		| "artist_updated"
		| "stage_manager_approved"
		| "notification"
		| "heartbeat";
	data: any;
	timestamp: string;
	userId?: string;
	userRole?: string;
}

interface ArtistRegisteredMessage extends WebSocketMessage {
	type: "artist_registered";
	data: {
		artist: Artist;
		eventId: string;
		eventName: string;
	};
}

interface NotificationMessage extends WebSocketMessage {
	type: "notification";
	data: Notification;
}
```

## Error Handling

### Client-Side Error Handling

#### Artist Dashboard Error Handling

```typescript
const ArtistDashboard = ({ params }: { params: { artistId: string } }) => {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchArtistData = async () => {
			try {
				const response = await fetch(`/api/artists/${params.artistId}`);
				if (!response.ok) {
					if (response.status === 404) {
						setError("Artist profile not found");
					} else {
						setError("Failed to load artist profile");
					}
					return;
				}
				const data = await response.json();
				setProfile(data.data);
			} catch (error) {
				setError("Network error occurred");
			} finally {
				setLoading(false);
			}
		};

		fetchArtistData();
	}, [params.artistId]);

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Error</h2>
					<p className="text-muted-foreground mb-4">{error}</p>
					<Button onClick={() => router.push("/")}>
						Back to Home
					</Button>
				</div>
			</div>
		);
	}
};
```

#### WebSocket Error Handling

```typescript
const useWebSocket = () => {
	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "connected" | "disconnected" | "error"
	>("disconnected");
	const [retryCount, setRetryCount] = useState(0);
	const maxRetries = 5;

	const connect = useCallback(() => {
		if (retryCount >= maxRetries) {
			setConnectionStatus("error");
			return;
		}

		setConnectionStatus("connecting");
		const ws = new WebSocket("ws://localhost:8080");

		ws.onopen = () => {
			setConnectionStatus("connected");
			setRetryCount(0);
		};

		ws.onerror = () => {
			setConnectionStatus("error");
		};

		ws.onclose = () => {
			setConnectionStatus("disconnected");
			// Auto-reconnect with exponential backoff
			setTimeout(() => {
				setRetryCount((prev) => prev + 1);
				connect();
			}, Math.pow(2, retryCount) * 1000);
		};
	}, [retryCount]);
};
```

### Server-Side Error Handling

#### API Error Responses

```typescript
interface ApiError {
	success: false;
	error: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: string;
}

interface ApiSuccess<T> {
	success: true;
	data: T;
	timestamp: string;
}

// Standardized error handling
const handleApiError = (error: any, context: string) => {
	console.error(`${context}:`, error);

	if (error.code === "ENOENT") {
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "NOT_FOUND",
					message: "Resource not found",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 404 }
		);
	}

	return NextResponse.json(
		{
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "An internal error occurred",
			},
			timestamp: new Date().toISOString(),
		},
		{ status: 500 }
	);
};
```

## Testing Strategy

### Unit Testing

#### Artist Dashboard Component Testing

```typescript
describe("ArtistDashboard", () => {
	it("should fetch and display artist data correctly", async () => {
		const mockArtist = { id: "123", artistName: "Test Artist" };
		jest.spyOn(global, "fetch").mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true, data: mockArtist }),
		});

		render(<ArtistDashboard params={{ artistId: "123" }} />);

		await waitFor(() => {
			expect(screen.getByText("Test Artist")).toBeInTheDocument();
		});
	});

	it("should handle artist not found error", async () => {
		jest.spyOn(global, "fetch").mockResolvedValue({
			ok: false,
			status: 404,
		});

		render(<ArtistDashboard params={{ artistId: "invalid" }} />);

		await waitFor(() => {
			expect(
				screen.getByText("Artist profile not found")
			).toBeInTheDocument();
		});
	});
});
```

#### WebSocket Integration Testing

```typescript
describe("WebSocket Integration", () => {
	it("should establish connection and receive messages", async () => {
		const mockWebSocket = {
			send: jest.fn(),
			close: jest.fn(),
			readyState: WebSocket.OPEN,
		};

		global.WebSocket = jest.fn(() => mockWebSocket);

		const { result } = renderHook(() => useWebSocket());

		// Simulate connection
		act(() => {
			mockWebSocket.onopen();
		});

		expect(result.current.isConnected).toBe(true);
	});
});
```

### Integration Testing

#### API Route Testing

```typescript
describe("/api/artists/[artistId]", () => {
	it("should return artist data for valid ID", async () => {
		const req = new NextRequest("http://localhost/api/artists/123");
		const response = await GET(req, { params: { artistId: "123" } });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.data).toBeDefined();
	});

	it("should return 404 for invalid artist ID", async () => {
		const req = new NextRequest("http://localhost/api/artists/invalid");
		const response = await GET(req, { params: { artistId: "invalid" } });

		expect(response.status).toBe(404);
	});
});
```

### End-to-End Testing

#### Artist Dashboard Flow

```typescript
describe("Artist Dashboard E2E", () => {
	it("should complete full artist dashboard flow", async () => {
		// Navigate to artist registration
		await page.goto("/artist-register/event123");

		// Fill out registration form
		await page.fill('[data-testid="artist-name"]', "Test Artist");
		await page.click('[data-testid="submit-registration"]');

		// Should redirect to artist dashboard with ID
		await page.waitForURL(/\/artist-dashboard\/[a-zA-Z0-9]+/);

		// Verify dashboard content
		await expect(page.locator('[data-testid="artist-name"]')).toContainText(
			"Test Artist"
		);
	});
});
```

## Performance Considerations

### WebSocket Optimization

-   **Connection Pooling**: Reuse WebSocket connections across components
-   **Message Batching**: Batch multiple updates to reduce message frequency
-   **Selective Updates**: Only send updates to relevant connected clients
-   **Heartbeat Mechanism**: Implement ping/pong to detect dead connections

### Data Fetching Optimization

-   **Caching Strategy**: Implement client-side caching for artist profiles
-   **Lazy Loading**: Load artist data on-demand in super admin dashboard
-   **Pagination**: Implement pagination for large artist lists
-   **Debounced Updates**: Debounce real-time updates to prevent UI thrashing

### GCS Integration Optimization

-   **Batch Operations**: Group multiple GCS operations when possible
-   **Parallel Fetching**: Fetch multiple artist profiles concurrently
-   **Error Recovery**: Implement retry logic for failed GCS operations
-   **Data Compression**: Compress large artist profile data

## Security Considerations

### Authentication and Authorization

-   **JWT Validation**: Verify JWT tokens for all WebSocket connections
-   **Role-based Access**: Ensure users can only access their own data
-   **API Security**: Validate user permissions for all API endpoints
-   **WebSocket Security**: Authenticate WebSocket connections on establishment

### Data Protection

-   **Input Sanitization**: Sanitize all user inputs before storage
-   **XSS Prevention**: Escape user-generated content in notifications
-   **CSRF Protection**: Implement CSRF tokens for state-changing operations
-   **Rate Limiting**: Limit WebSocket message frequency per user

## Accessibility

### WCAG Compliance

-   **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
-   **Screen Reader Support**: Provide proper ARIA labels for dynamic content
-   **Focus Management**: Manage focus properly in notification dropdowns
-   **Color Contrast**: Ensure sufficient contrast for notification badges

### Real-time Updates Accessibility

-   **Screen Reader Announcements**: Announce important real-time updates
-   **Reduced Motion**: Respect user's motion preferences for animations
-   **Focus Preservation**: Maintain focus when content updates dynamically
-   **Alternative Indicators**: Provide non-visual indicators for real-time changes
