// (c) Copyright Datacraft, 2026
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUploadDocument } from '../../api';
import { formatBytes, cn } from '@/lib/utils';

interface UploadModalProps {
    onClose: () => void;
    parentId?: string;
}

export function UploadModal({ onClose, parentId }: UploadModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<{ name: string; status: 'success' | 'error'; message?: string }[]>([]);

    const uploadMutation = useUploadDocument();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const newResults: typeof results = [];

        for (const file of files) {
            try {
                await uploadMutation.mutateAsync({ file, parent_id: parentId });
                newResults.push({ name: file.name, status: 'success' });
            } catch (error) {
                newResults.push({
                    name: file.name,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Upload failed'
                });
            }
        }

        setResults(newResults);
        setUploading(false);
        setFiles([]);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-display font-semibold text-slate-100">Upload Documents</h2>
                        <p className="text-sm text-slate-500 mt-1">Select files to upload to the current folder</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {results.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Upload Results</h3>
                            <div className="space-y-2">
                                {results.map((result, i) => (
                                    <div key={i} className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border",
                                        result.status === 'success' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-red-500/5 border-red-500/20 text-red-400"
                                    )}>
                                        {result.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        <span className="text-sm font-medium truncate flex-1">{result.name}</span>
                                        {result.message && <span className="text-xs opacity-70">{result.message}</span>}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setResults([])}
                                className="text-xs text-slate-500 hover:text-slate-300 underline"
                            >
                                Clear results
                            </button>
                        </div>
                    )}

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
                            isDragActive ? "border-brass-500 bg-brass-500/5" : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/20"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-base font-medium text-slate-200">
                                    {isDragActive ? "Drop files here" : "Click or drag files to upload"}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">PDF, Images, Word, Excel up to 50MB</p>
                            </div>
                        </div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Selected Files ({files.length})</h3>
                            <div className="space-y-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 group">
                                        <File className="w-4 h-4 text-slate-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFile(i)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-all text-slate-400 hover:text-red-400"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800/50 flex items-center justify-end gap-3 bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="btn-ghost"
                        disabled={uploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        className="btn-primary min-w-[120px]"
                        disabled={files.length === 0 || uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Upload {files.length > 0 ? `(${files.length})` : ''}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
