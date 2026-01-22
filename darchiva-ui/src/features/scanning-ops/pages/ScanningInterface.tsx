import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    ArrowLeft,
    Box,
    CheckCircle,
    Scan,
    FileText,
    AlertTriangle,
    ChevronRight,
    RotateCcw,
    Mic,
    MicOff,
    Trash2,
    RotateCw,
    Maximize2,
    Keyboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScanningControls } from '../hooks/useScanningControls';
import { autoQC, QCResult } from '../services/AutoQCService';
import { useScanPage } from '../api/hooks';

type Step = 'receive' | 'unbundle' | 'scan' | 'repack' | 'return';

interface ScannedPage {
    id: string;
    url: string;
    qc: QCResult | null;
    rotation: number;
}

export function ScanningInterface() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<Step>('receive');
    const [pages, setPages] = useState<ScannedPage[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [batchId] = useState('BATCH-2026-001'); // TODO: Get from route params

    const scanPage = useScanPage();

    // Real scanning function using API
    const handleScan = async () => {
        try {
            const result = await scanPage.mutateAsync({
                batch_id: batchId,
                simulate: true
            }) as { id: string; url: string; page_number: number; batch_id: string; scanned_at: string; qc_status: string };

            // Run QC on the scanned image
            const qcResult = await autoQC.analyzeImage(result.url);

            const newPage: ScannedPage = {
                id: result.id,
                url: result.url,
                qc: qcResult,
                rotation: 0
            };

            setPages(prev => [...prev, newPage]);
            setSelectedPageId(result.id);
        } catch (error) {
            console.error('Scan failed:', error);
        }
    };

    const handleNext = () => {
        if (currentStep === 'scan') setCurrentStep('repack');
        else if (currentStep === 'repack') setCurrentStep('return');
        else if (currentStep === 'return') navigate('/scanning/operator');
    };

    const handleStop = () => {
        // Pause logic
    };

    const handleRetake = () => {
        if (selectedPageId) {
            setPages(prev => prev.filter(p => p.id !== selectedPageId));
            setSelectedPageId(null);
        }
    };

    const { isListening, lastCommand, toggleVoice } = useScanningControls({
        onScan: handleScan,
        onNext: handleNext,
        onStop: handleStop,
        onRetake: handleRetake
    });

    const rotatePage = (id: string) => {
        setPages(prev => prev.map(p =>
            p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
        ));
    };

    const steps = [
        { id: 'receive', label: 'Receive', icon: Box },
        { id: 'unbundle', label: 'Unbundle', icon: FileText },
        { id: 'scan', label: 'Scan', icon: Scan },
        { id: 'repack', label: 'Repack', icon: RotateCcw },
        { id: 'return', label: 'Return', icon: CheckCircle },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => navigate('/scanning/operator')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Dashboard
                </button>

                <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-mono">BATCH-2026-001</span>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold uppercase">
                        In Progress
                    </span>
                    {/* Voice Status Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                        {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                        {isListening ? 'Listening...' : 'Voice Off'}
                    </div>
                    {lastCommand && (
                        <span className="text-xs font-mono text-brass-400 animate-fade-out">
                            Last: "{lastCommand}"
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10" />
                {steps.map((step, index) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-950 px-4">
                            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                ${isActive ? 'border-brass-500 bg-brass-500 text-slate-900' :
                                    isCompleted ? 'border-green-500 bg-green-500 text-slate-900' :
                                        'border-slate-700 bg-slate-900 text-slate-500'}
              `}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-bold uppercase ${isActive ? 'text-brass-400' : 'text-slate-500'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Main Action Area */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                    {currentStep === 'receive' && (
                        <motion.div
                            key="receive"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col items-center justify-center text-center"
                        >
                            <Box className="w-24 h-24 text-slate-700 mb-6" />
                            <h2 className="text-3xl font-bold mb-4">Scan Batch Barcode</h2>
                            <p className="text-slate-400 max-w-md mb-8">
                                Scan the barcode on the physical box to confirm receipt and transfer custody to your station.
                            </p>
                            <input
                                type="text"
                                placeholder="Click to scan..."
                                className="bg-slate-950 border-2 border-slate-700 rounded-xl px-6 py-4 w-96 text-center text-xl focus:border-brass-500 outline-none transition-colors"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && setCurrentStep('unbundle')}
                            />
                        </motion.div>
                    )}

                    {currentStep === 'unbundle' && (
                        <motion.div
                            key="unbundle"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full max-w-4xl mx-auto w-full"
                        >
                            <h2 className="text-2xl font-bold mb-6">Unbundling Checklist</h2>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                {['Remove staples and clips', 'Unfold corners', 'Sort by size', 'Check for fragile items'].map((item, i) => (
                                    <label key={i} className="flex items-center gap-4 p-4 bg-slate-950 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                                        <input type="checkbox" className="w-6 h-6 rounded border-slate-600 text-brass-500 focus:ring-brass-500/50" />
                                        <span className="text-lg">{item}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setCurrentStep('scan')}
                                    className="px-8 py-4 bg-brass-500 text-slate-900 font-bold rounded-xl hover:bg-brass-400 transition-colors flex items-center gap-2"
                                >
                                    Start Scanning <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 'scan' && (
                        <motion.div
                            key="scan"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex gap-6"
                        >
                            {/* Left: Controls & Thumbnails */}
                            <div className="w-80 flex flex-col gap-4">
                                {/* Scanner Status */}
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Scanner</span>
                                        <div className="flex items-center gap-1 text-green-400 text-xs">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            Ready
                                        </div>
                                    </div>
                                    <div className="text-slate-300 font-bold">Fujitsu fi-7160</div>
                                    <div className="text-slate-500 text-xs">300 DPI • Color • Duplex</div>
                                </div>

                                {/* Hands-Free Controls */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={toggleVoice}
                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors ${isListening ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                    >
                                        <Mic className="w-5 h-5" />
                                        <span className="text-xs font-bold">Voice</span>
                                    </button>
                                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400">
                                        <Keyboard className="w-5 h-5" />
                                        <span className="text-xs font-bold">Pedal Ready</span>
                                    </div>
                                </div>

                                {/* Big Scan Button */}
                                <button
                                    onClick={handleScan}
                                    className="bg-brass-600 hover:bg-brass-500 text-slate-900 rounded-xl font-bold text-xl py-6 flex flex-col items-center justify-center gap-2 transition-colors shadow-lg shadow-brass-900/20"
                                >
                                    <Scan className="w-8 h-8" />
                                    SCAN PAGE
                                </button>

                                {/* Thumbnails / Reorder List */}
                                <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                                    <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase flex justify-between">
                                        <span>Pages ({pages.length})</span>
                                        <span>Drag to Reorder</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2">
                                        <Reorder.Group axis="y" values={pages} onReorder={setPages} className="space-y-2">
                                            {pages.map((page) => (
                                                <Reorder.Item key={page.id} value={page}>
                                                    <div
                                                        onClick={() => setSelectedPageId(page.id)}
                                                        className={`
                              p-2 rounded-lg border flex gap-3 cursor-pointer transition-colors
                              ${selectedPageId === page.id ? 'bg-slate-800 border-brass-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}
                            `}
                                                    >
                                                        <div className="w-12 h-16 bg-slate-800 rounded overflow-hidden relative">
                                                            <img src={page.url} alt="" className="w-full h-full object-cover opacity-50" />
                                                            {page.qc?.issues.length ? (
                                                                <div className="absolute top-0 right-0 p-0.5 bg-red-500">
                                                                    <AlertTriangle className="w-3 h-3 text-white" />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-slate-300 truncate">Page {page.id.slice(-4)}</div>
                                                            {page.qc?.issues.length ? (
                                                                <div className="text-xs text-red-400 truncate">{page.qc.issues[0]}</div>
                                                            ) : (
                                                                <div className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> QC Pass</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Reorder.Item>
                                            ))}
                                        </Reorder.Group>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Preview & Tools */}
                            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative">
                                {selectedPageId ? (
                                    <>
                                        {/* Toolbar */}
                                        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => rotatePage(selectedPageId)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Rotate">
                                                    <RotateCw className="w-5 h-5" />
                                                </button>
                                                <button onClick={handleRetake} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400" title="Delete">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Fullscreen">
                                                    <Maximize2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Image View */}
                                        <div className="flex-1 p-8 flex items-center justify-center bg-slate-950 relative">
                                            {(() => {
                                                const page = pages.find(p => p.id === selectedPageId);
                                                if (!page) return null;
                                                return (
                                                    <motion.div
                                                        layoutId={selectedPageId}
                                                        className="relative shadow-2xl"
                                                        animate={{ rotate: page.rotation }}
                                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                                    >
                                                        <img
                                                            src={page.url}
                                                            alt="Scanned Page"
                                                            className="max-h-[60vh] rounded-sm border border-slate-700"
                                                        />
                                                        {/* QC Overlays */}
                                                        {page.qc?.issues.map((issue, i) => (
                                                            <motion.div
                                                                key={i}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap"
                                                            >
                                                                <AlertTriangle className="w-3 h-3" /> {issue}
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                );
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                                        <Scan className="w-16 h-16 mb-4 opacity-50" />
                                        <p>Select a page to preview</p>
                                    </div>
                                )}

                                {/* Finish Batch Button */}
                                {pages.length > 0 && (
                                    <div className="absolute bottom-6 right-6">
                                        <button
                                            onClick={() => setCurrentStep('repack')}
                                            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2"
                                        >
                                            Finish Batch <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {(currentStep === 'repack' || currentStep === 'return') && (
                        <motion.div
                            key="finish"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="h-full flex flex-col items-center justify-center"
                        >
                            <CheckCircle className="w-24 h-24 text-green-500 mb-6" />
                            <h2 className="text-3xl font-bold mb-4">Batch Completed!</h2>
                            <button
                                onClick={() => navigate('/scanning/operator')}
                                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors"
                            >
                                Return to Dashboard
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
