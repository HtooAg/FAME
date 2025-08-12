/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	swcMinify: false,
	webpack: (config, { dev, isServer }) => {
		if (!dev && !isServer) {
			config.optimization.minimize = false;
		}
		return config;
	},
};

export default nextConfig;
