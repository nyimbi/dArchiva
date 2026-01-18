// OCR Settings Section
import { SettingsCard, SettingsToggle, SettingsSelect, SettingsSlider } from '../ui/SettingsControls';
import { useOCRSettings, useUpdateOCRSettings } from '../../api/hooks';

export function OCRSettings() {
	const { data: settings } = useOCRSettings();
	const updateMutation = useUpdateOCRSettings();

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">OCR & AI</h2>
				<p className="text-sm text-slate-400 mt-1">Text recognition and document intelligence settings</p>
			</div>

			<SettingsCard title="OCR Engine">
				<SettingsSelect
					label="Default Engine"
					description="Primary OCR engine for text extraction"
					value={settings?.default_engine || 'hybrid'}
					options={[
						{ value: 'tesseract', label: 'Tesseract (Fastest)' },
						{ value: 'paddleocr', label: 'PaddleOCR (Accurate)' },
						{ value: 'qwen-vl', label: 'Qwen-VL (AI Vision)' },
						{ value: 'hybrid', label: 'Hybrid (Auto-select)' },
					]}
					onChange={(v) => updateMutation.mutate({ default_engine: v as any })}
				/>
				<SettingsSelect
					label="Fallback Engine"
					description="Used when primary fails"
					value={settings?.fallback_engine || 'tesseract'}
					options={[
						{ value: 'tesseract', label: 'Tesseract' },
						{ value: 'paddleocr', label: 'PaddleOCR' },
					]}
					onChange={(v) => updateMutation.mutate({ fallback_engine: v })}
				/>
				<SettingsToggle
					label="GPU Acceleration"
					description="Use GPU for faster processing (requires compatible hardware)"
					checked={settings?.gpu_acceleration ?? false}
					onChange={(v) => updateMutation.mutate({ gpu_acceleration: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Languages">
				<SettingsSelect
					label="Default Language"
					value={settings?.default_language || 'eng'}
					options={[
						{ value: 'eng', label: 'English' },
						{ value: 'fra', label: 'French' },
						{ value: 'deu', label: 'German' },
						{ value: 'spa', label: 'Spanish' },
						{ value: 'chi_sim', label: 'Chinese (Simplified)' },
						{ value: 'jpn', label: 'Japanese' },
						{ value: 'kor', label: 'Korean' },
						{ value: 'ara', label: 'Arabic' },
					]}
					onChange={(v) => updateMutation.mutate({ default_language: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Automation">
				<SettingsToggle
					label="Auto-OCR on Upload"
					description="Automatically extract text from uploaded documents"
					checked={settings?.auto_ocr_enabled ?? true}
					onChange={(v) => updateMutation.mutate({ auto_ocr_enabled: v })}
				/>
				<SettingsToggle
					label="Auto-Classify Documents"
					description="Automatically detect document types using AI"
					checked={settings?.auto_classify_enabled ?? false}
					onChange={(v) => updateMutation.mutate({ auto_classify_enabled: v })}
				/>
				<SettingsSlider
					label="Confidence Threshold"
					description="Minimum OCR confidence to accept results"
					value={settings?.confidence_threshold || 0.7}
					min={0.5}
					max={0.99}
					step={0.01}
					onChange={(v) => updateMutation.mutate({ confidence_threshold: v })}
				/>
			</SettingsCard>
		</div>
	);
}
