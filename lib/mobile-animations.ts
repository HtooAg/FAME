import { Variants } from "framer-motion";

// Reduced motion variants for mobile devices
export const mobileCardVariants: Variants = {
	hidden: {
		opacity: 0,
		y: 20,
		scale: 0.95,
	},
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: {
			duration: 0.3,
			ease: "easeOut",
		},
	},
};

export const mobileStaggerContainer: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.1,
			delayChildren: 0.1,
		},
	},
};

export const mobileFadeIn: Variants = {
	hidden: {
		opacity: 0,
		y: 15,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.4,
			ease: "easeOut",
		},
	},
};

// Utility to detect if user prefers reduced motion
export const shouldReduceMotion = () => {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Mobile-optimized hover effects
export const mobileHoverScale = {
	scale: 1.02,
	transition: { duration: 0.2 },
};

export const mobileTapScale = {
	scale: 0.98,
	transition: { duration: 0.1 },
};
