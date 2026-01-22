// (c) Copyright Datacraft, 2026
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScanBarcode, ScanResult } from '../api';
import styles from './BarcodeScanner.module.css';

interface Props {
	onScanResult: (result: ScanResult) => void;
}

export function BarcodeScanner({ onScanResult }: Props) {
	const [inputValue, setInputValue] = useState('');
	const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual');
	const [lastResult, setLastResult] = useState<ScanResult | null>(null);
	const [scanPurpose, setScanPurpose] = useState<string>('lookup');
	const inputRef = useRef<HTMLInputElement>(null);

	const scanBarcode = useScanBarcode();

	// Auto-focus input for hardware scanner support
	useEffect(() => {
		if (scanMode === 'manual' && inputRef.current) {
			inputRef.current.focus();
		}
	}, [scanMode]);

	const handleScan = async () => {
		if (!inputValue.trim()) return;

		const result = await scanBarcode.mutateAsync({
			scannedCode: inputValue.trim(),
			codeType: 'qr',
			scanPurpose,
		});

		setLastResult(result);
		onScanResult(result);

		if (result.success) {
			setInputValue('');
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleScan();
		}
	};

	const purposes = [
		{ id: 'lookup', label: 'Lookup', icon: '⌕' },
		{ id: 'checkin', label: 'Check In', icon: '↙' },
		{ id: 'checkout', label: 'Check Out', icon: '↗' },
		{ id: 'verify', label: 'Verify', icon: '✓' },
		{ id: 'move', label: 'Move', icon: '↔' },
	];

	return (
		<div className={styles.scanner}>
			{/* Scanner Header */}
			<div className={styles.header}>
				<div className={styles.scannerIcon}>⌘</div>
				<h2 className={styles.title}>Barcode Scanner</h2>
				<p className={styles.subtitle}>Scan QR codes or barcodes to lookup containers and documents</p>
			</div>

			{/* Mode Toggle */}
			<div className={styles.modeToggle}>
				<button
					className={`${styles.modeBtn} ${scanMode === 'manual' ? styles.active : ''}`}
					onClick={() => setScanMode('manual')}
				>
					<span>⌨</span> Manual Entry
				</button>
				<button
					className={`${styles.modeBtn} ${scanMode === 'camera' ? styles.active : ''}`}
					onClick={() => setScanMode('camera')}
				>
					<span>📷</span> Camera
				</button>
			</div>

			{/* Scan Purpose */}
			<div className={styles.purposeSection}>
				<span className={styles.purposeLabel}>SCAN PURPOSE</span>
				<div className={styles.purposeGrid}>
					{purposes.map((p) => (
						<button
							key={p.id}
							className={`${styles.purposeBtn} ${scanPurpose === p.id ? styles.active : ''}`}
							onClick={() => setScanPurpose(p.id)}
						>
							<span className={styles.purposeIcon}>{p.icon}</span>
							{p.label}
						</button>
					))}
				</div>
			</div>

			{/* Manual Entry */}
			{scanMode === 'manual' && (
				<div className={styles.manualEntry}>
					<div className={styles.inputGroup}>
						<input
							ref={inputRef}
							type="text"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Scan or enter barcode..."
							className={styles.input}
							autoFocus
						/>
						<button
							onClick={handleScan}
							disabled={!inputValue.trim() || scanBarcode.isPending}
							className={styles.scanBtn}
						>
							{scanBarcode.isPending ? '...' : '→'}
						</button>
					</div>
					<p className={styles.hint}>
						Press Enter to scan. Hardware scanners will auto-submit.
					</p>
				</div>
			)}

			{/* Camera Mode */}
			{scanMode === 'camera' && (
				<div className={styles.cameraPlaceholder}>
					<div className={styles.cameraIcon}>📷</div>
					<p>Camera scanning requires browser permissions</p>
					<button className={styles.enableBtn}>Enable Camera</button>
				</div>
			)}

			{/* Result Display */}
			<AnimatePresence>
				{lastResult && (
					<motion.div
						className={`${styles.result} ${lastResult.success ? styles.success : styles.error}`}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
					>
						<div className={styles.resultHeader}>
							<span className={styles.resultIcon}>
								{lastResult.success ? '✓' : '✕'}
							</span>
							<span className={styles.resultTitle}>
								{lastResult.success ? 'Scan Successful' : 'Scan Failed'}
							</span>
						</div>

						{lastResult.success && lastResult.resolvedData && (
							<div className={styles.resultData}>
								<div className={styles.resultType}>
									{lastResult.resolvedType?.toUpperCase()}
								</div>
								<div className={styles.resultDetails}>
									{Object.entries(lastResult.resolvedData).map(([key, value]) => (
										<div key={key} className={styles.resultRow}>
											<span className={styles.resultKey}>{key}</span>
											<span className={styles.resultValue}>{String(value)}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{!lastResult.success && lastResult.errorMessage && (
							<p className={styles.errorMessage}>{lastResult.errorMessage}</p>
						)}

						{lastResult.success && (
							<button
								className={styles.viewBtn}
								onClick={() => onScanResult(lastResult)}
							>
								View Details →
							</button>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Scan Instructions */}
			<div className={styles.instructions}>
				<h4 className={styles.instructionsTitle}>Supported Formats</h4>
				<div className={styles.formatList}>
					<div className={styles.formatItem}>
						<span className={styles.formatIcon}>▣</span>
						<span className={styles.formatName}>QR Code</span>
					</div>
					<div className={styles.formatItem}>
						<span className={styles.formatIcon}>▥</span>
						<span className={styles.formatName}>Data Matrix</span>
					</div>
					<div className={styles.formatItem}>
						<span className={styles.formatIcon}>▤</span>
						<span className={styles.formatName}>Code 128</span>
					</div>
					<div className={styles.formatItem}>
						<span className={styles.formatIcon}>▦</span>
						<span className={styles.formatName}>Code 39</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export default BarcodeScanner;
