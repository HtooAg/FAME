// Stub types for sample UI components that use different frameworks
// These are not used in the main application but need to compile

export interface UseParamsResult {
	eventId?: string;
	artistId?: string;
	[key: string]: string | undefined;
}

export interface NavigateFunction {
	(to: string): void;
}

export interface SupabaseClient {
	from: (table: string) => any;
	channel: (name: string) => any;
	removeChannel: (channel: any) => void;
	auth: {
		getUser: () => Promise<any>;
		signOut: () => Promise<any>;
	};
	storage: {
		from: (bucket: string) => any;
	};
	functions: {
		invoke: (name: string, options?: any) => Promise<any>;
	};
}

export interface UseToastResult {
	toast: (options: {
		title: string;
		description?: string;
		variant?: "default" | "destructive";
	}) => void;
}

// Mock implementations for sample UI
export const useParams = (): UseParamsResult => ({ eventId: "" });
export const useNavigate = (): NavigateFunction => () => {};
export const supabase: SupabaseClient = {
	from: () => ({}),
	channel: () => ({}),
	removeChannel: () => {},
	auth: {
		getUser: () => Promise.resolve({ data: { user: null } }),
		signOut: () => Promise.resolve(),
	},
	storage: {
		from: () => ({
			upload: () => Promise.resolve({ data: null, error: null }),
			getPublicUrl: () => ({ data: { publicUrl: "" } }),
			remove: () => Promise.resolve({ error: null }),
		}),
	},
	functions: {
		invoke: () => Promise.resolve({ data: null, error: null }),
	},
};
export const useToast = (): UseToastResult => ({
	toast: () => {},
});
