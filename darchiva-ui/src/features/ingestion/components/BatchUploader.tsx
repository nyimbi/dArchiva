// (c) Copyright Datacraft, 2026
import { useState, useCallback, useRef } from 'react';
import { useCreateBatch, useIngestionTemplates } from '../api';
import styles from './BatchUploader.module.css';

interface FileWithProgress {
	file: File;
	progress: number;
	status: 'pending' | 'uploading' | 'done' | 'error';
}

export function BatchUploader() {
	const [files, setFiles] = useState<FileWithProgress[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState<string>('');
	const [batchName, setBatchName] = useState('');
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data: templates } = useIngestionTemplates();
	const createBatch = useCreateBatch();

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
			file,
			progress: 0,
			status: 'pending' as const,
		}));
		setFiles((prev) => [...prev, ...droppedFiles]);
	}, []);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const selectedFiles = Array.from(e.target.files).map((file) => ({
				file,
				progress: 0,
				status: 'pending' as const,
			}));
			setFiles((prev) => [...prev, ...selectedFiles]);
		}
	};

	const removeFile = (index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const clearAll = () => {
		setFiles([]);
		setBatchName('');
	};

	const startUpload = async () => {
		if (files.length === 0) return;

		// Simulate file upload progress
		for (let i = 0; i < files.length; i++) {
			setFiles((prev) =>
				prev.map((f, idx) =>
					idx === i ? { ...f, status: 'uploading' } : f
				)
			);

			// Simulate progress
			for (let progress = 0; progress <= 100; progress += 20) {
				await new Promise((r) => setTimeout(r, 100));
				setFiles((prev) =>
					prev.map((f, idx) =>
						idx === i ? { ...f, progress } : f
					)
				);
			}

			setFiles((prev) =>
				prev.map((f, idx) =>
					idx === i ? { ...f, status: 'done', progress: 100 } : f
				)
			);
		}

		// Create batch
		await createBatch.mutateAsync({
			name: batchName || `Batch ${new Date().toISOString().split('T')[0]}`,
			templateId: selectedTemplate || undefined,
			filePaths: files.map((f) => f.file.name),
		});
	};

	const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h3>Batch Upload</h3>
				<div className={styles.options}>
					<input
						type="text"
						placeholder="Batch name (optional)"
						value={batchName}
						onChange={(e) => setBatchName(e.target.value)}
						className={styles.input}
					/>
					<select
						value={selectedTemplate}
						onChange={(e) => setSelectedTemplate(e.target.value)}
						className={styles.select}
					>
						<option value="">No template</option>
						{templates?.items.map((t) => (
							<option key={t.id} value={t.id}>{t.name}</option>
						))}
					</select>
				</div>
			</div>

			<div
				className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
				onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
			>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					onChange={handleFileSelect}
					className={styles.fileInput}
				/>
				<div className={styles.dropzoneContent}>
					<span className={styles.dropIcon}>+</span>
					<p>Drop files here or click to browse</p>
					<span className={styles.hint}>PDF, TIFF, JPG, PNG supported</span>
				</div>
			</div>

			{files.length > 0 && (
				<>
					<div className={styles.fileList}>
						<div className={styles.fileListHeader}>
							<span>{files.length} files ({formatSize(totalSize)})</span>
							<button onClick={clearAll} className={styles.clearBtn}>Clear all</button>
						</div>
						{files.map((f, i) => (
							<div key={i} className={styles.fileItem}>
								<div className={styles.fileInfo}>
									<span className={styles.fileName}>{f.file.name}</span>
									<span className={styles.fileSize}>{formatSize(f.file.size)}</span>
								</div>
								{f.status === 'uploading' && (
									<div className={styles.progressBar}>
										<div className={styles.progress} style={{ width: `${f.progress}%` }} />
									</div>
								)}
								{f.status === 'done' && <span className={styles.checkmark}>Done</span>}
								{f.status === 'pending' && (
									<button onClick={() => removeFile(i)} className={styles.removeBtn}>X</button>
								)}
							</div>
						))}
					</div>

					<div className={styles.actions}>
						<button
							onClick={startUpload}
							disabled={createBatch.isPending || files.every((f) => f.status === 'done')}
							className={styles.uploadBtn}
						>
							{createBatch.isPending ? 'Processing...' : 'Start Upload'}
						</button>
					</div>
				</>
			)}
		</div>
	);
}

export default BatchUploader;
