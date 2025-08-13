"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	Music,
	Clock,
	Users,
	ArrowUp,
	ArrowDown,
	Save,
	Shuffle,
	Play,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface PerformanceSlot {
	id: string;
	artistId: string;
	artistName: string;
	style: string;
	duration: number;
	order: number;
	startTime?: string;
	endTime?: string;
	notes?: string;
}

export default function PerformanceOrderManagement() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [performanceOrder, setPerformanceOrder] = useState<PerformanceSlot[]>(
		[]
	);
	const [artists, setArtists] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showStartTime, setShowStartTime] = useState("19:00"); // 7 PM default

	useEffect(() => {
		fetchData();
	}, [eventId]);

	const fetchData = async () => {
		try {
			// Fetch performance order
			const orderResponse = await fetch(
				`/api/events/${eventId}/performance-order`
			);
			if (orderResponse.ok) {
				const orderData = await orderResponse.json();
				setPerformanceOrder(orderData.performanceOrder || []);
			}

			// Fetch artists (from GCS via API)
			const artistResponse = await fetch(
				`/api/events/${eventId}/artists`
			);
			if (artistResponse.ok) {
				const artistData = await artistResponse.json();
				setArtists(artistData.data || []);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to load performance order data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDragEnd = (result: any) => {
		if (!result.destination) return;

		const items = Array.from(performanceOrder);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);

		// Update order numbers
		const updatedItems = items.map((item, index) => ({
			...item,
			order: index + 1,
		}));

		setPerformanceOrder(updatedItems);
		calculateTimes(updatedItems);
	};

	const calculateTimes = (slots: PerformanceSlot[]) => {
		let currentTime = new Date(`2024-01-01 ${showStartTime}:00`);

		const updatedSlots = slots.map((slot) => {
			const startTime = currentTime.toTimeString().slice(0, 5);
			currentTime.setMinutes(
				currentTime.getMinutes() + slot.duration + 5
			); // 5 min buffer
			const endTime = currentTime.toTimeString().slice(0, 5);

			return {
				...slot,
				startTime,
				endTime,
			};
		});

		setPerformanceOrder(updatedSlots);
	};

	const addArtistToOrder = (artist: any) => {
		const newSlot: PerformanceSlot = {
			id: `slot_${Date.now()}`,
			artistId: artist.id,
			artistName: artist.artistName,
			style: artist.style,
			duration: artist.performanceDuration || 15,
			order: performanceOrder.length + 1,
		};

		const updatedOrder = [...performanceOrder, newSlot];
		setPerformanceOrder(updatedOrder);
		calculateTimes(updatedOrder);
	};

	const removeFromOrder = (slotId: string) => {
		const updatedOrder = performanceOrder
			.filter((slot) => slot.id !== slotId)
			.map((slot, index) => ({ ...slot, order: index + 1 }));

		setPerformanceOrder(updatedOrder);
		calculateTimes(updatedOrder);
	};

	const shuffleOrder = () => {
		const shuffled = [...performanceOrder].sort(() => Math.random() - 0.5);
		const updatedOrder = shuffled.map((slot, index) => ({
			...slot,
			order: index + 1,
		}));
		setPerformanceOrder(updatedOrder);
		calculateTimes(updatedOrder);
	};

	const saveOrder = async () => {
		setSaving(true);
		try {
			const response = await fetch(
				`/api/events/${eventId}/performance-order`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						performanceOrder,
						showStartTime,
					}),
				}
			);

			if (response.ok) {
				toast({
					title: "Success",
					description: "Performance order saved successfully",
				});
			} else {
				throw new Error("Failed to save performance order");
			}
		} catch (error) {
			console.error("Error saving performance order:", error);
			toast({
				title: "Error",
				description: "Failed to save performance order",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const getTotalDuration = () => {
		return performanceOrder.reduce(
			(total, slot) => total + slot.duration,
			0
		);
	};

	const getEndTime = () => {
		if (performanceOrder.length === 0) return showStartTime;
		const lastSlot = performanceOrder[performanceOrder.length - 1];
		return lastSlot.endTime || showStartTime;
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
					<p className="text-gray-600">
						Loading performance order...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-8"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="outline"
								onClick={() => router.back()}
								className="flex items-center gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Event
							</Button>
							<div>
								<h1 className="text-3xl font-bold text-gray-900">
									Performance Order Management
								</h1>
								<p className="text-gray-600">
									Arrange and manage the show lineup
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={shuffleOrder}
								disabled={performanceOrder.length === 0}
							>
								<Shuffle className="h-4 w-4 mr-2" />
								Shuffle
							</Button>
							<Button
								onClick={saveOrder}
								disabled={
									saving || performanceOrder.length === 0
								}
								className="bg-green-600 hover:bg-green-700"
							>
								{saving ? (
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
								) : (
									<Save className="h-4 w-4 mr-2" />
								)}
								Save Order
							</Button>
						</div>
					</div>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Available Artists */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									Available Artists
								</CardTitle>
								<CardDescription>
									Drag artists to the performance order or
									click to add
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{artists
									.filter(
										(artist) =>
											!performanceOrder.some(
												(slot) =>
													slot.artistId === artist.id
											)
									)
									.map((artist) => (
										<div
											key={artist.id}
											className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
											onClick={() =>
												addArtistToOrder(artist)
											}
										>
											<div className="flex items-center justify-between">
												<div>
													<p className="font-medium">
														{artist.artistName}
													</p>
													<div className="flex items-center gap-2 text-sm text-gray-500">
														<Badge variant="secondary">
															{artist.style}
														</Badge>
														<span>
															{artist.performanceDuration ||
																15}{" "}
															min
														</span>
													</div>
												</div>
												<Button
													size="sm"
													variant="ghost"
												>
													Add
												</Button>
											</div>
										</div>
									))}
								{artists.filter(
									(artist) =>
										!performanceOrder.some(
											(slot) =>
												slot.artistId === artist.id
										)
								).length === 0 && (
									<div className="text-center py-8 text-gray-500">
										<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>
											All artists have been added to the
											performance order
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</motion.div>

					{/* Performance Order */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="lg:col-span-2"
					>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Play className="h-5 w-5" />
									Performance Order
								</CardTitle>
								<CardDescription>
									Drag to reorder performances
								</CardDescription>
							</CardHeader>
							<CardContent>
								{/* Show Settings */}
								<div className="mb-6 p-4 bg-gray-50 rounded-lg">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
										<div>
											<label className="block font-medium mb-1">
												Show Start Time
											</label>
											<input
												type="time"
												value={showStartTime}
												onChange={(e) => {
													setShowStartTime(
														e.target.value
													);
													calculateTimes(
														performanceOrder
													);
												}}
												className="w-full p-2 border rounded"
											/>
										</div>
										<div>
											<label className="block font-medium mb-1">
												Total Duration
											</label>
											<p className="p-2 bg-white border rounded">
												{getTotalDuration()} minutes
											</p>
										</div>
										<div>
											<label className="block font-medium mb-1">
												Estimated End Time
											</label>
											<p className="p-2 bg-white border rounded">
												{getEndTime()}
											</p>
										</div>
									</div>
								</div>

								{/* Drag and Drop List */}
								<DragDropContext onDragEnd={handleDragEnd}>
									<Droppable droppableId="performance-order">
										{(provided) => (
											<div
												{...provided.droppableProps}
												ref={provided.innerRef}
												className="space-y-3"
											>
												{performanceOrder.map(
													(slot, index) => (
														<Draggable
															key={slot.id}
															draggableId={
																slot.id
															}
															index={index}
														>
															{(
																provided,
																snapshot
															) => (
																<div
																	ref={
																		provided.innerRef
																	}
																	{...provided.draggableProps}
																	{...provided.dragHandleProps}
																	className={`p-4 border rounded-lg bg-white transition-shadow ${
																		snapshot.isDragging
																			? "shadow-lg"
																			: "hover:shadow-md"
																	}`}
																>
																	<div className="flex items-center justify-between">
																		<div className="flex items-center gap-4">
																			<div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center font-bold text-sm">
																				{
																					slot.order
																				}
																			</div>
																			<div>
																				<p className="font-medium">
																					{
																						slot.artistName
																					}
																				</p>
																				<div className="flex items-center gap-3 text-sm text-gray-500">
																					<Badge variant="secondary">
																						{
																							slot.style
																						}
																					</Badge>
																					<span className="flex items-center gap-1">
																						<Clock className="h-3 w-3" />
																						{
																							slot.duration
																						}{" "}
																						min
																					</span>
																					{slot.startTime && (
																						<span>
																							{
																								slot.startTime
																							}{" "}
																							-{" "}
																							{
																								slot.endTime
																							}
																						</span>
																					)}
																				</div>
																			</div>
																		</div>
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() =>
																				removeFromOrder(
																					slot.id
																				)
																			}
																			className="text-red-600 hover:text-red-700"
																		>
																			Remove
																		</Button>
																	</div>
																</div>
															)}
														</Draggable>
													)
												)}
												{provided.placeholder}
											</div>
										)}
									</Droppable>
								</DragDropContext>

								{performanceOrder.length === 0 && (
									<div className="text-center py-12 text-gray-500">
										<Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<h3 className="text-lg font-medium mb-2">
											No performances scheduled
										</h3>
										<p>
											Add artists from the left panel to
											create your show lineup
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
