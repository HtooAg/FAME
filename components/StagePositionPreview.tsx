"use client";

import { cn } from "@/lib/utils";

interface StagePositionPreviewProps {
	startPosition?: string;
	endPosition?: string;
	className?: string;
}

export function StagePositionPreview({
	startPosition,
	endPosition,
	className,
}: StagePositionPreviewProps) {
	const getPositionCoordinates = (position: string) => {
		const positions: { [key: string]: { x: number; y: number } } = {
			"upstage-left": { x: 10, y: 10 },
			upstage: { x: 50, y: 10 },
			"upstage-right": { x: 90, y: 10 },
			left: { x: 10, y: 50 },
			center: { x: 50, y: 50 },
			right: { x: 90, y: 50 },
			"downstage-left": { x: 10, y: 90 },
			downstage: { x: 50, y: 90 },
			"downstage-right": { x: 90, y: 90 },
		};
		return positions[position] || { x: 50, y: 50 };
	};

	const startCoords = startPosition
		? getPositionCoordinates(startPosition)
		: null;
	const endCoords = endPosition ? getPositionCoordinates(endPosition) : null;

	return (
		<div className={cn("w-full max-w-md mx-auto", className)}>
			<div
				className="relative bg-gray-100 border-2 border-gray-300 rounded-lg p-4"
				style={{ aspectRatio: "3/2" }}
			>
				{/* Stage Labels */}
				<div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
					UPSTAGE
				</div>
				<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600">
					DOWNSTAGE (AUDIENCE)
				</div>

				{/* Grid Lines */}
				<svg
					className="absolute inset-0 w-full h-full"
					style={{ pointerEvents: "none" }}
				>
					{/* Vertical lines */}
					<line
						x1="33.33%"
						y1="0"
						x2="33.33%"
						y2="100%"
						stroke="#d1d5db"
						strokeWidth="1"
						strokeDasharray="2,2"
					/>
					<line
						x1="66.66%"
						y1="0"
						x2="66.66%"
						y2="100%"
						stroke="#d1d5db"
						strokeWidth="1"
						strokeDasharray="2,2"
					/>
					{/* Horizontal lines */}
					<line
						x1="0"
						y1="33.33%"
						x2="100%"
						y2="33.33%"
						stroke="#d1d5db"
						strokeWidth="1"
						strokeDasharray="2,2"
					/>
					<line
						x1="0"
						y1="66.66%"
						x2="100%"
						y2="66.66%"
						stroke="#d1d5db"
						strokeWidth="1"
						strokeDasharray="2,2"
					/>
				</svg>

				{/* Position Markers */}
				{startCoords && (
					<div
						className="absolute w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
						style={{
							left: `${startCoords.x}%`,
							top: `${startCoords.y}%`,
						}}
					>
						<span className="text-white text-xs font-bold">S</span>
					</div>
				)}

				{endCoords && endCoords !== startCoords && (
					<div
						className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
						style={{
							left: `${endCoords.x}%`,
							top: `${endCoords.y}%`,
						}}
					>
						<span className="text-white text-xs font-bold">E</span>
					</div>
				)}

				{/* Movement Line */}
				{startCoords && endCoords && startCoords !== endCoords && (
					<svg
						className="absolute inset-0 w-full h-full"
						style={{ pointerEvents: "none" }}
					>
						<line
							x1={`${startCoords.x}%`}
							y1={`${startCoords.y}%`}
							x2={`${endCoords.x}%`}
							y2={`${endCoords.y}%`}
							stroke="#3b82f6"
							strokeWidth="2"
							strokeDasharray="5,5"
							markerEnd="url(#arrowhead)"
						/>
						<defs>
							<marker
								id="arrowhead"
								markerWidth="10"
								markerHeight="7"
								refX="9"
								refY="3.5"
								orient="auto"
							>
								<polygon
									points="0 0, 10 3.5, 0 7"
									fill="#3b82f6"
								/>
							</marker>
						</defs>
					</svg>
				)}
			</div>

			{/* Legend */}
			<div className="flex justify-center gap-4 mt-2 text-xs text-gray-600">
				{startCoords && (
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-green-500 rounded-full"></div>
						<span>Start</span>
					</div>
				)}
				{endCoords && endCoords !== startCoords && (
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-red-500 rounded-full"></div>
						<span>End</span>
					</div>
				)}
			</div>
		</div>
	);
}
