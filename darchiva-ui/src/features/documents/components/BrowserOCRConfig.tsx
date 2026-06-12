/**
 * Browser OCR Configuration Component
 *
 * Allows users to configure VLM-based OCR with multiple providers:
 * - Ollama Cloud (recommended)
 * - Local Ollama
 * - Anthropic Claude Vision
 * - OpenAI GPT-4 Vision
 */

import { cn } from '@/lib/utils';
import { VLM_PROVIDERS,type VLMProvider } from '@/lib/vlm-ocr';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertCircle,
  Check,
  Cloud,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  Monitor,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import { useCallback,useEffect,useState } from 'react';
import { useBrowserOCR,type BrowserOCRConfig as OCRConfig } from '../hooks/useBrowserOCR';

export type OCRMode = 'backend' | 'browser';

export interface BrowserOCRConfigProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	ocrMode: OCRMode;
	onOCRModeChange: (mode: OCRMode) => void;
	onConfigChange?: (config: OCRConfig) => void;
}

const PROVIDER_ICONS: Record<VLMProvider, React.ReactNode> = {
	'azure-openai': <Cloud className="w-5 h-5" />,
	'ollama-cloud': <Cloud className="w-5 h-5" />,
	ollama: <Monitor className="w-5 h-5" />,
	anthropic: <Zap className="w-5 h-5" />,
	openai: <Zap className="w-5 h-5" />,
};

export function BrowserOCRConfig({
	open,
	onOpenChange,
	ocrMode,
	onOCRModeChange,
	onConfigChange,
}: BrowserOCRConfigProps) {
	const [showApiKey, setShowApiKey] = useState(false);
	const [tempApiKey, setTempApiKey] = useState('');

	const {
		status,
		isConnected,
		availableModels,
		config,
		setConfig,
		checkConnection,
		providerInfo,
	} = useBrowserOCR();

	const [isChecking, setIsChecking] = useState(false);

	const handleCheckConnection = useCallback(async () => {
		setIsChecking(true);
		try {
			await checkConnection();
		} finally {
			setIsChecking(false);
		}
	}, [checkConnection]);

	// Check connection when dialog opens and browser mode is selected
	useEffect(() => {
		if (open && ocrMode === 'browser' && config.enabled) {
			handleCheckConnection();
		}
	}, [open, ocrMode, config.enabled, handleCheckConnection]);

	// Notify parent of config changes
	useEffect(() => {
		onConfigChange?.(config);
	}, [config, onConfigChange]);

	const handleModeChange = (mode: OCRMode) => {
		onOCRModeChange(mode);
		setConfig({ enabled: mode === 'browser' });
	};

	const handleProviderChange = (provider: VLMProvider) => {
		const info = providerInfo[provider];
		setConfig({
			provider,
			ollamaHost: 'host' in info ? info.host : config.ollamaHost,
			ollamaModel: info.defaultModel,
		});
		setTempApiKey('');
	};

	const handleApiKeySubmit = () => {
		if (config.provider === 'ollama-cloud') {
			setConfig({ ollamaApiKey: tempApiKey });
		} else {
			setConfig({ apiKey: tempApiKey });
		}
		setTimeout(handleCheckConnection, 100);
	};

	const currentProvider = providerInfo[config.provider];
	const needsApiKey = currentProvider.requiresApiKey;
	const hasApiKey =
		config.provider === 'ollama-cloud'
			? !!config.ollamaApiKey
			: config.provider === 'ollama'
				? true
				: !!config.apiKey;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-2">
						OCR Configuration
					</Dialog.Title>
					<Dialog.Description className="text-sm text-slate-400 mb-6">
						Choose how to process document text recognition
					</Dialog.Description>

					{/* OCR Mode Selection */}
					<div className="space-y-4 mb-6">
						<label className="block text-sm font-medium text-slate-300">
							OCR Processing Mode
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => handleModeChange('backend')}
								className={cn(
									'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
									ocrMode === 'backend'
										? 'border-brass-500 bg-brass-500/10'
										: 'border-slate-700 hover:border-slate-600'
								)}
							>
								<Server
									className={cn(
										'w-8 h-8',
										ocrMode === 'backend' ? 'text-brass-400' : 'text-slate-400'
									)}
								/>
								<span
									className={cn(
										'text-sm font-medium',
										ocrMode === 'backend' ? 'text-brass-400' : 'text-slate-300'
									)}
								>
									Backend OCR
								</span>
								<span className="text-xs text-slate-500 text-center">
									Server processes OCR
								</span>
							</button>

							<button
								onClick={() => handleModeChange('browser')}
								className={cn(
									'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
									ocrMode === 'browser'
										? 'border-brass-500 bg-brass-500/10'
										: 'border-slate-700 hover:border-slate-600'
								)}
							>
								<Monitor
									className={cn(
										'w-8 h-8',
										ocrMode === 'browser' ? 'text-brass-400' : 'text-slate-400'
									)}
								/>
								<span
									className={cn(
										'text-sm font-medium',
										ocrMode === 'browser' ? 'text-brass-400' : 'text-slate-300'
									)}
								>
									Browser OCR
								</span>
								<span className="text-xs text-slate-500 text-center">
									VLM-powered OCR
								</span>
							</button>
						</div>
					</div>

					{/* Mode Description */}
					<div
						className={cn(
							'flex items-start gap-3 p-3 rounded-lg mb-6',
							ocrMode === 'backend' ? 'bg-blue-500/10' : 'bg-purple-500/10'
						)}
					>
						<Info
							className={cn(
								'w-5 h-5 flex-shrink-0 mt-0.5',
								ocrMode === 'backend' ? 'text-blue-400' : 'text-purple-400'
							)}
						/>
						<div className="text-sm">
							{ocrMode === 'backend' ? (
								<>
									<p className="text-blue-400 font-medium">Backend OCR</p>
									<p className="text-slate-400 mt-1">
										The server handles OCR using Tesseract or server-side VLM.
										Works with any browser, no local setup required.
									</p>
								</>
							) : (
								<>
									<p className="text-purple-400 font-medium">
										Browser VLM OCR
									</p>
									<p className="text-slate-400 mt-1">
										Your browser connects directly to a VLM service for
										high-quality OCR. Choose from Ollama Cloud, local Ollama,
										or other providers.
									</p>
								</>
							)}
						</div>
					</div>

					{/* Browser Mode: Provider Selection */}
					{ocrMode === 'browser' && (
						<div className="space-y-4">
							{/* Provider Selection */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-slate-300">
									VLM Provider
								</label>
								<div className="grid grid-cols-2 gap-2">
									{(Object.keys(providerInfo) as VLMProvider[]).map(
										(provider) => {
											const info = providerInfo[provider];
											const isSelected = config.provider === provider;
											return (
												<button
													key={provider}
													onClick={() => handleProviderChange(provider)}
													className={cn(
														'flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left',
														isSelected
															? 'border-brass-500 bg-brass-500/10'
															: 'border-slate-700 hover:border-slate-600'
													)}
												>
													<div
														className={cn(
															'w-8 h-8 rounded flex items-center justify-center',
															isSelected
																? 'bg-brass-500/20 text-brass-400'
																: 'bg-slate-700 text-slate-400'
														)}
													>
														{PROVIDER_ICONS[provider]}
													</div>
													<div className="flex-1 min-w-0">
														<p
															className={cn(
																'text-sm font-medium truncate',
																isSelected
																	? 'text-brass-400'
																	: 'text-slate-200'
															)}
														>
															{info.name}
														</p>
														<p className="text-[10px] text-slate-500 truncate">
															{info.description}
														</p>
													</div>
													{isSelected && (
														<Check className="w-4 h-4 text-brass-400" />
													)}
												</button>
											);
										}
									)}
								</div>
							</div>

							{/* Connection Status */}
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-slate-300">
									Connection Status
								</label>
								<button
									onClick={handleCheckConnection}
									disabled={isChecking}
									className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
									title="Check connection"
								>
									{isChecking ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<RefreshCw className="w-4 h-4" />
									)}
								</button>
							</div>

							<div
								className={cn(
									'flex items-center gap-3 p-3 rounded-lg border',
									isConnected
										? 'bg-emerald-500/10 border-emerald-500/30'
										: 'bg-slate-800 border-slate-700'
								)}
							>
								{isConnected ? (
									<>
										<div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
											<Zap className="w-5 h-5 text-emerald-400" />
										</div>
										<div className="flex-1">
											<p className="text-sm font-medium text-emerald-400">
												Connected
											</p>
											<p className="text-xs text-slate-500">
												{availableModels.length} models available
											</p>
										</div>
										<Check className="w-5 h-5 text-emerald-400" />
									</>
								) : (
									<>
										<div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
											<Cloud className="w-5 h-5 text-slate-400" />
										</div>
										<div className="flex-1">
											<p className="text-sm font-medium text-slate-300">
												Not Connected
											</p>
											<p className="text-xs text-slate-500">
												{status?.error || 'Check configuration'}
											</p>
										</div>
										<AlertCircle className="w-5 h-5 text-amber-400" />
									</>
								)}
							</div>

							{/* API Key Input (for providers that need it) */}
							{needsApiKey && (
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-300 flex items-center gap-2">
										<Key className="w-4 h-4" />
										{config.provider === 'ollama-cloud'
											? 'Ollama API Key'
											: config.provider === 'anthropic'
												? 'Anthropic API Key'
												: config.provider === 'azure-openai'
													? 'Azure OpenAI API Key'
													: 'OpenAI API Key'}
									</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												type={showApiKey ? 'text' : 'password'}
												value={tempApiKey}
												onChange={(e) => setTempApiKey(e.target.value)}
												placeholder={
													hasApiKey ? '••••••••••••' : 'Enter API key'
												}
												className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brass-500"
											/>
											<button
												type="button"
												onClick={() => setShowApiKey(!showApiKey)}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
											>
												{showApiKey ? (
													<EyeOff className="w-4 h-4" />
												) : (
													<Eye className="w-4 h-4" />
												)}
											</button>
										</div>
										<button
											onClick={handleApiKeySubmit}
											disabled={!tempApiKey}
											className="px-3 py-2 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Save
										</button>
									</div>
									<p className="text-xs text-slate-500">
										{config.provider === 'ollama-cloud' && (
											<>
												Get your API key at{' '}
												<a
													href="https://ollama.com/settings/keys"
													target="_blank"
													rel="noopener noreferrer"
													className="text-brass-400 hover:underline"
												>
													ollama.com/settings/keys
												</a>
											</>
										)}
										{config.provider === 'anthropic' && (
											<>
												Get your API key at{' '}
												<a
													href="https://console.anthropic.com/settings/keys"
													target="_blank"
													rel="noopener noreferrer"
													className="text-brass-400 hover:underline"
												>
													console.anthropic.com
												</a>
											</>
										)}
										{config.provider === 'openai' && (
											<>
												Get your API key at{' '}
												<a
													href="https://platform.openai.com/api-keys"
													target="_blank"
													rel="noopener noreferrer"
													className="text-brass-400 hover:underline"
												>
													platform.openai.com
												</a>
											</>
										)}
										{config.provider === 'azure-openai' && (
											<>
												Get your API key from Azure Portal &gt; OpenAI resource &gt; Keys
											</>
										)}
									</p>
								</div>
							)}

							{/* Azure OpenAI specific settings */}
							{config.provider === 'azure-openai' && (
								<>
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-300">
											Azure Endpoint
										</label>
										<input
											type="text"
											value={config.azureEndpoint || ''}
											onChange={(e) =>
												setConfig({ azureEndpoint: e.target.value } as Partial<OCRConfig>)
											}
											placeholder="https://your-resource.openai.azure.com/"
											className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brass-500"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium text-slate-300">
											Deployment Name
										</label>
										<input
											type="text"
											value={config.azureDeployment || ''}
											onChange={(e) =>
												setConfig({ azureDeployment: e.target.value } as Partial<OCRConfig>)
											}
											placeholder="gpt-4o"
											className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brass-500"
										/>
									</div>
								</>
							)}

							{/* Local Ollama Host (only for local provider) */}
							{config.provider === 'ollama' && (
								<div className="space-y-2">
									<label className="text-sm font-medium text-slate-300">
										Ollama Host
									</label>
									<input
										type="text"
										value={config.ollamaHost}
										onChange={(e) =>
											setConfig({ ollamaHost: e.target.value })
										}
										placeholder="http://localhost:11434"
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brass-500"
									/>
								</div>
							)}

							{/* Model Selection */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-slate-300">
									Model
								</label>
								<select
									value={config.ollamaModel}
									onChange={(e) => setConfig({ ollamaModel: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-brass-500"
								>
									{(
										availableModels.length > 0
											? availableModels
											: currentProvider.models
									).map((model) => (
										<option key={model} value={model}>
											{model}
										</option>
									))}
								</select>
							</div>

							{/* Provider-specific notes */}
							{config.provider === 'ollama' && !isConnected && (
								<div className="p-3 bg-slate-800 rounded-lg space-y-2">
									<p className="text-sm font-medium text-slate-300">
										Quick Setup
									</p>
									<ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
										<li>
											Install Ollama:{' '}
											<code className="text-slate-300">
												brew install ollama
											</code>
										</li>
										<li>
											Start Ollama:{' '}
											<code className="text-slate-300">ollama serve</code>
										</li>
										<li>
											Pull a vision model:{' '}
											<code className="text-slate-300">
												ollama pull qwen2.5-vl:7b
											</code>
										</li>
										<li>Click "Check connection" above</li>
									</ol>
								</div>
							)}
						</div>
					)}

					{/* Footer */}
					<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
						<button
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors"
						>
							Done
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

/**
 * Small indicator showing current OCR mode
 */
export function OCRModeIndicator({
	mode,
	onClick,
	isConnected,
	provider,
}: {
	mode: OCRMode;
	onClick?: () => void;
	isConnected?: boolean;
	provider?: VLMProvider;
}) {
	const providerName = provider ? VLM_PROVIDERS[provider].name : 'VLM';

	return (
		<button
			onClick={onClick}
			className={cn(
				'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
				mode === 'backend'
					? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
					: isConnected
						? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
						: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
			)}
			title={`Click to change OCR mode (currently: ${mode})`}
		>
			{mode === 'backend' ? (
				<>
					<Server className="w-3 h-3" />
					<span>Backend OCR</span>
				</>
			) : (
				<>
					{provider === 'ollama-cloud' || provider === 'ollama' ? (
						<Monitor className="w-3 h-3" />
					) : (
						<Cloud className="w-3 h-3" />
					)}
					<span>{providerName}</span>
					{!isConnected && <AlertCircle className="w-3 h-3" />}
				</>
			)}
		</button>
	);
}
