/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	// Completely disable minification to avoid Unicode issues
	swcMinify: false,
	env: {
		// Skip WebSocket initialization during build
		NEXT_BUILD_SKIP_WEBSOCKET:
			process.env.NODE_ENV === "production" ? "true" : "false",
		// Build environment detection
		NEXT_BUILD_STATIC_ONLY:
			process.env.NODE_ENV === "production" ? "true" : "false",
	},
	experimental: {
		// External packages that should not be bundled
		serverComponentsExternalPackages: ["ws", "@google-cloud/storage"],
	},
	// Disable source maps in production builds for faster builds
	productionBrowserSourceMaps: false,
	webpack: (config, { dev, isServer, webpack }) => {
		// Disable minification completely to avoid Unicode issues
		if (!dev) {
			config.optimization.minimize = false;
			config.optimization.minimizer = [];
		}

		// Exclude problematic packages from client bundle
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				ws: false,
				fs: false,
				net: false,
				tls: false,
				crypto: false,
				stream: false,
				url: false,
				zlib: false,
				http: false,
				https: false,
				assert: false,
				os: false,
				path: false,
			};
		}

		// Add build context detection
		config.plugins.push(
			new webpack.DefinePlugin({
				"process.env.WEBPACK_BUILD_CONTEXT": JSON.stringify("build"),
			})
		);

		return config;
	},
};

export default nextConfig;
