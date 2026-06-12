// (c) Copyright Datacraft, 2026
import { useEffect,useState } from 'react';

const TOKEN_KEY = 'darchiva_token';

interface AuthenticatedImageProps {
	src: string;
	alt: string;
	className?: string;
	fallback?: React.ReactNode;
}

/**
 * An image/document component that fetches content with authentication.
 * Handles both images and PDFs automatically based on content type.
 */
export function AuthenticatedImage({ src, alt, className, fallback }: AuthenticatedImageProps) {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [contentType, setContentType] = useState<string | null>(null);
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;
		let objectUrl: string | null = null;

		async function fetchImage() {
			try {
				const token = localStorage.getItem(TOKEN_KEY);
				const headers: Record<string, string> = {};
				if (token) {
					headers['Authorization'] = `Bearer ${token}`;
				}

				const response = await fetch(src, { headers });

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				const blob = await response.blob();
				const type = response.headers.get('content-type') || blob.type;
				objectUrl = URL.createObjectURL(blob);

				if (mounted) {
					setBlobUrl(objectUrl);
					setContentType(type);
					setLoading(false);
				}
				} catch {
					if (mounted) {
						setError(true);
						setLoading(false);
					}
			}
		}

		fetchImage();

		return () => {
			mounted = false;
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [src]);

	if (loading) {
		return (
			<div className={`${className} bg-slate-700 animate-pulse flex items-center justify-center`}>
				<span className="text-slate-500 text-xs">Loading...</span>
			</div>
		);
	}

	if (error || !blobUrl) {
		if (fallback) {
			return <>{fallback}</>;
		}
		return (
			<div className={`${className} bg-slate-800 flex items-center justify-center`}>
				<span className="text-slate-500 text-xs">Failed to load</span>
			</div>
		);
	}

	// Handle PDFs with embed tag
	if (contentType?.includes('pdf')) {
		return (
			<embed
				src={blobUrl}
				type="application/pdf"
				className={className}
				style={{ width: '100%', height: '100%', minHeight: '500px' }}
			/>
		);
	}

	// Handle images with img tag
	return <img src={blobUrl} alt={alt} className={className} />;
}
