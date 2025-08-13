"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { RefreshCw, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LazyMediaLoaderProps {
	artistId: string;
	mediaType: "music" | "gallery";
	initialItems: any[];
	totalCount: number;
	onError?: (error: string) => void;
}

export function LazyMediaLoader({
	artistId,
	mediaType,
	initialItems,
	totalCount,
	onError,
}: LazyMediaLoaderProps) {
	const [items, setItems] = useState(initialItems);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(initialItems.length < totalCount);
	const { toast } = useToast();
	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	// Load more items when scrolling near the bottom
	const loadMoreItems = async () => {
		if (loading || !hasMore) return;

		setLoading(true);
		try {
			const response = await fetch(
				`/api/artists/${artistId}/media?type=${mediaType}&start=${items.length}&count=10`
			);

			if (!response.ok) {
				throw new Error("Failed to load media");
			}

			const data = await response.json();
			if (data.success && data.data) {
				setItems((prev) => [...prev, ...data.data]);
				setHasMore(items.length + data.data.length < totalCount);
			}
		} catch (error) {
			console.error("Error loading more media:", error);
			const errorMsg = `Failed to load more ${mediaType} files`;
			onError?.(errorMsg);
			toast({
				title: "Loading Error",
				description: errorMsg,
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	// Set up intersection observer for infinite scroll
	useEffect(() => {
		if (!loadMoreRef.current || !hasMore) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMoreItems();
				}
			},
			{ threshold: 0.1 }
		);

		observerRef.current.observe(loadMoreRef.current);

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [hasMore, items.length]);

	// Load URLs for items that need them (lazy loading)
	const loadItemUrl = async (index: number) => {
		const item = items[index];
		if (!item.needsUrl || item.loadingUrl) return;

		// Mark as loading to prevent duplicate requests
		const updatedItems = [...items];
		updatedItems[index] = { ...item, loadingUrl: true };
		setItems(updatedItems);

		try {
			const response = await fetch(
				`/api/artists/${artistId}/media?type=${mediaType}&start=${index}&count=1`
			);

			if (!response.ok) {
				throw new Error("Failed to load media URL");
			}

			const data = await response.json();
			if (data.success && data.data && data.data[0]) {
				const updatedItems = [...items];
				updatedItems[index] = {
					...data.data[0],
					needsUrl: false,
					loadingUrl: false,
				};
				setItems(updatedItems);
			}
		} catch (error) {
			console.error("Error loading media URL:", error);
			// Reset loading state on error
			const updatedItems = [...items];
			updatedItems[index] = { ...item, loadingUrl: false };
			setItems(updatedItems);
		}
	};

	const renderMediaItem = (item: any, index: number) => {
		if (mediaType === "music") {
			// For music, load URL when component mounts if needed
			if (item.needsUrl && !item.loadingUrl) {
				loadItemUrl(index);
			}

			return <AudioPlayer key={index} track={item} onError={onError} />;
		} else {
			// For gallery, load URL on demand (when user scrolls to it)
			const handleImageLoad = () => {
				if (item.needsUrl && !item.loadingUrl) {
					loadItemUrl(index);
				}
			};

			if (item.type === "video") {
				return (
					<div key={index} onMouseEnter={handleImageLoad}>
						<VideoPlayer file={item} onError={onError} />
					</div>
				);
			} else {
				return (
					<div key={index} onMouseEnter={handleImageLoad}>
						<ImageViewer file={item} onError={onError} />
					</div>
				);
			}
		}
	};

	return (
		<div className="space-y-4">
			{mediaType === "music" ? (
				<div className="space-y-4">
					{items.map((item, index) => renderMediaItem(item, index))}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{items.map((item, index) => renderMediaItem(item, index))}
				</div>
			)}

			{/* Load more trigger */}
			{hasMore && (
				<div ref={loadMoreRef} className="flex justify-center py-4">
					{loading ? (
						<div className="flex items-center gap-2 text-muted-foreground">
							<RefreshCw className="h-4 w-4 animate-spin" />
							<span>Loading more {mediaType}...</span>
						</div>
					) : (
						<Button
							variant="outline"
							onClick={loadMoreItems}
							className="flex items-center gap-2"
						>
							<ChevronDown className="h-4 w-4" />
							Load More{" "}
							{mediaType === "music" ? "Tracks" : "Files"}
						</Button>
					)}
				</div>
			)}

			{!hasMore && items.length > 0 && (
				<div className="text-center py-4 text-muted-foreground text-sm">
					All {mediaType} files loaded ({items.length} total)
				</div>
			)}
		</div>
	);
}
