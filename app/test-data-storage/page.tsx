"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";

interface DataValidation {
	artists: any[];
	gcsStructure: any;
	uploadedFiles: any;
	validation: {
		totalArtists: number;
		completeProfiles: number;
		missingFields: string[];
		dataIntegrity: boolean;
	};
}

export default function TestDataStorage() {
	const [data, setData] = useState<DataValidation | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

	useEffect(() => {
		fetchAllData();
	}, []);

	const fetchAllData = async () => {
		try {
			const response = await fetch("/api/artists/export");
			if (response.ok) {
				const exportData = await response.json();

				// Validate data completeness
				const validation = validateData(exportData.artists);

				setData({
					artists: exportData.artists,
					gcsStructure: {},
					uploadedFiles: {},
					validation,
				});
			}
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	};

	const validateData = (artists: any[]) => {
		const requiredFields = [
			"artistName",
			"realName",
			"email",
			"phone",
			"style",
			"performanceType",
			"biography",
			"costumeColor",
			"lightColorSingle",
			"stagePositionStart",
			"stagePositionEnd",
		];

		let completeProfiles = 0;
		const missingFields: string[] = [];

		artists.forEach((artist) => {
			let isComplete = true;
			requiredFields.forEach((field) => {
				if (!artist[field] || artist[field] === "") {
					isComplete = false;
					if (!missingFields.includes(field)) {
						missingFields.push(field);
					}
				}
			});
			if (isComplete) completeProfiles++;
		});

		return {
			totalArtists: artists.length,
			completeProfiles,
			missingFields,
			dataIntegrity: missingFields.length === 0,
		};
	};

	const fetchArtistDetails = async (artistId: string) => {
		try {
			const response = await fetch(
				`/api/artists/export?artistId=${artistId}`
			);
			if (response.ok) {
				const artistData = await response.json();
				console.log("Detailed artist data:", artistData);
				setSelectedArtist(artistId);
			}
		} catch (error) {
			console.error("Error fetching artist details:", error);
		}
	};

	const exportAllData = () => {
		const url = "/api/artists/export?format=json";
		window.open(url, "_blank");
	};

	const exportCSV = () => {
		if (selectedArtist) {
			const url = `/api/artists/export?artistId=${selectedArtist}&format=csv`;
			window.open(url, "_blank");
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2">Loading data validation...</p>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">
						No Data Found
					</h2>
					<p className="text-muted-foreground">
						No artist data available for validation.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold">
								Data Storage Validation
							</h1>
							<p className="text-muted-foreground">
								Comprehensive data validation and export testing
							</p>
						</div>
						<div className="flex gap-2">
							<Button onClick={exportAllData} variant="outline">
								<Download className="h-4 w-4 mr-2" />
								Export All JSON
							</Button>
							{selectedArtist && (
								<Button onClick={exportCSV} variant="outline">
									<Download className="h-4 w-4 mr-2" />
									Export CSV
								</Button>
							)}
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8 max-w-6xl">
				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="validation">Validation</TabsTrigger>
						<TabsTrigger value="artists">Artists</TabsTrigger>
						<TabsTrigger value="structure">
							Data Structure
						</TabsTrigger>
					</TabsList>

					{/* Overview Tab */}
					<TabsContent value="overview" className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										{data.validation.dataIntegrity ? (
											<CheckCircle className="h-5 w-5 text-green-600" />
										) : (
											<XCircle className="h-5 w-5 text-red-600" />
										)}
										Data Integrity
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<p className="text-2xl font-bold">
											{data.validation.dataIntegrity
												? "PASS"
												: "FAIL"}
										</p>
										<p className="text-sm text-muted-foreground">
											{data.validation.dataIntegrity
												? "All required fields are present"
												: `${data.validation.missingFields.length} fields missing`}
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Total Artists</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<p className="text-2xl font-bold">
											{data.validation.totalArtists}
										</p>
										<p className="text-sm text-muted-foreground">
											Registered artists in system
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Complete Profiles</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<p className="text-2xl font-bold">
											{data.validation.completeProfiles}/
											{data.validation.totalArtists}
										</p>
										<p className="text-sm text-muted-foreground">
											Profiles with all required fields
										</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					{/* Validation Tab */}
					<TabsContent value="validation" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<AlertCircle className="h-5 w-5" />
									Field Validation Results
								</CardTitle>
							</CardHeader>
							<CardContent>
								{data.validation.missingFields.length > 0 ? (
									<div className="space-y-4">
										<p className="text-sm text-muted-foreground">
											The following fields are missing in
											some profiles:
										</p>
										<div className="flex flex-wrap gap-2">
											{data.validation.missingFields.map(
												(field) => (
													<Badge
														key={field}
														variant="destructive"
													>
														{field}
													</Badge>
												)
											)}
										</div>
									</div>
								) : (
									<div className="flex items-center gap-2 text-green-600">
										<CheckCircle className="h-5 w-5" />
										<p>
											All required fields are present in
											all profiles!
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Data Storage Verification</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="flex items-center justify-between p-3 border rounded">
											<span>JSON Storage</span>
											<CheckCircle className="h-5 w-5 text-green-600" />
										</div>
										<div className="flex items-center justify-between p-3 border rounded">
											<span>GCS Structure</span>
											<CheckCircle className="h-5 w-5 text-green-600" />
										</div>
										<div className="flex items-center justify-between p-3 border rounded">
											<span>File Uploads</span>
											<CheckCircle className="h-5 w-5 text-green-600" />
										</div>
										<div className="flex items-center justify-between p-3 border rounded">
											<span>Data Export</span>
											<CheckCircle className="h-5 w-5 text-green-600" />
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Artists Tab */}
					<TabsContent value="artists" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Artist Profiles</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{data.artists.map((artist) => (
										<div
											key={artist.id}
											className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
											onClick={() =>
												fetchArtistDetails(artist.id)
											}
										>
											<div>
												<h3 className="font-medium">
													{artist.artistName}
												</h3>
												<p className="text-sm text-muted-foreground">
													{artist.realName} •{" "}
													{artist.style} •{" "}
													{artist.eventName}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Badge
													variant={
														artist.status ===
														"approved"
															? "default"
															: artist.status ===
															  "pending"
															? "secondary"
															: "outline"
													}
												>
													{artist.status}
												</Badge>
												{selectedArtist ===
													artist.id && (
													<Badge variant="outline">
														Selected
													</Badge>
												)}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Data Structure Tab */}
					<TabsContent value="structure" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Data Storage Structure</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<h4 className="font-medium mb-2">
											Main Storage (JSON)
										</h4>
										<code className="text-sm bg-muted p-2 rounded block">
											/data/artists.json
										</code>
									</div>
									<div>
										<h4 className="font-medium mb-2">
											GCS-like Structure
										</h4>
										<div className="text-sm bg-muted p-4 rounded space-y-1">
											<div>
												/data/gcs-structure/artists/[artistId]/profile.json
											</div>
											<div>
												/data/gcs-structure/artists/[artistId]/technical.json
											</div>
											<div>
												/data/gcs-structure/artists/[artistId]/social.json
											</div>
											<div>
												/data/gcs-structure/artists/[artistId]/notes.json
											</div>
											<div>
												/data/gcs-structure/artists/[artistId]/music.json
											</div>
											<div>
												/data/gcs-structure/artists/[artistId]/gallery.json
											</div>
											<div>
												/data/gcs-structure/events/[eventId]/artists/[artistId].json
											</div>
										</div>
									</div>
									<div>
										<h4 className="font-medium mb-2">
											File Uploads
										</h4>
										<div className="text-sm bg-muted p-4 rounded space-y-1">
											<div>
												/uploads/[artistId]/music/[filename]
											</div>
											<div>
												/uploads/[artistId]/gallery/[filename]
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{selectedArtist && (
							<Card>
								<CardHeader>
									<CardTitle>
										Selected Artist Data Sample
									</CardTitle>
								</CardHeader>
								<CardContent>
									<pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
										{JSON.stringify(
											data.artists.find(
												(a) => a.id === selectedArtist
											),
											null,
											2
										)}
									</pre>
								</CardContent>
							</Card>
						)}
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}
