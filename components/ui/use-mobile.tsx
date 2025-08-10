"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState<boolean>(false);

	useEffect(() => {
		const mql = window.matchMedia(
			`(max-width: ${MOBILE_BREAKPOINT - 1}px)`
		);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isMobile;
}

export function useIsTablet() {
	const [isTablet, setIsTablet] = useState<boolean>(false);

	useEffect(() => {
		const mql = window.matchMedia(
			`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: 1024px)`
		);
		const onChange = () => {
			const width = window.innerWidth;
			setIsTablet(width >= MOBILE_BREAKPOINT && width <= 1024);
		};
		mql.addEventListener("change", onChange);
		onChange();
		return () => mql.removeEventListener("change", onChange);
	}, []);

	return isTablet;
}

export function useScreenSize() {
	const [screenSize, setScreenSize] = useState<
		"mobile" | "tablet" | "desktop"
	>("desktop");

	useEffect(() => {
		const updateScreenSize = () => {
			const width = window.innerWidth;
			if (width < MOBILE_BREAKPOINT) {
				setScreenSize("mobile");
			} else if (width <= 1024) {
				setScreenSize("tablet");
			} else {
				setScreenSize("desktop");
			}
		};

		updateScreenSize();
		window.addEventListener("resize", updateScreenSize);
		return () => window.removeEventListener("resize", updateScreenSize);
	}, []);

	return screenSize;
}
