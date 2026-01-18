// Search Settings Section
import { SettingsCard, SettingsToggle, SettingsSelect, SettingsSlider } from '../ui/SettingsControls';
import { useSearchSettings, useUpdateSearchSettings } from '../../api/hooks';

export function SearchSettings() {
	const { data: settings } = useSearchSettings();
	const updateMutation = useUpdateSearchSettings();

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Search</h2>
				<p className="text-sm text-slate-400 mt-1">Configure search engine and indexing behavior</p>
			</div>

			<SettingsCard title="Search Backend">
				<SettingsSelect
					label="Engine"
					description="Search engine for document queries"
					value={settings?.backend || 'postgres'}
					options={[
						{ value: 'postgres', label: 'PostgreSQL Full-Text' },
						{ value: 'elasticsearch', label: 'Elasticsearch' },
						{ value: 'meilisearch', label: 'Meilisearch' },
					]}
					onChange={(v) => updateMutation.mutate({ backend: v as any })}
				/>
			</SettingsCard>

			<SettingsCard title="Semantic Search">
				<SettingsToggle
					label="Enable Semantic Search"
					description="Search by meaning using AI embeddings"
					checked={settings?.semantic_search_enabled ?? false}
					onChange={(v) => updateMutation.mutate({ semantic_search_enabled: v })}
				/>
				{settings?.semantic_search_enabled && (
					<SettingsSelect
						label="Embedding Model"
						value={settings?.embedding_model || 'nomic-embed-text'}
						options={[
							{ value: 'nomic-embed-text', label: 'Nomic Embed Text' },
							{ value: 'all-MiniLM-L6-v2', label: 'MiniLM (Fast)' },
							{ value: 'text-embedding-3-small', label: 'OpenAI Small' },
						]}
						onChange={(v) => updateMutation.mutate({ embedding_model: v })}
					/>
				)}
			</SettingsCard>

			<SettingsCard title="Indexing">
				<SettingsToggle
					label="Index on Upload"
					description="Automatically index new documents"
					checked={settings?.index_on_upload ?? true}
					onChange={(v) => updateMutation.mutate({ index_on_upload: v })}
				/>
				<SettingsToggle
					label="Fuzzy Matching"
					description="Allow typo-tolerant searches"
					checked={settings?.fuzzy_matching ?? true}
					onChange={(v) => updateMutation.mutate({ fuzzy_matching: v })}
				/>
				<SettingsToggle
					label="Highlight Results"
					description="Show matching text in search results"
					checked={settings?.highlight_enabled ?? true}
					onChange={(v) => updateMutation.mutate({ highlight_enabled: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Limits">
				<SettingsSlider
					label="Max Results"
					description="Maximum documents returned per query"
					value={settings?.max_results || 100}
					min={10}
					max={500}
					step={10}
					onChange={(v) => updateMutation.mutate({ max_results: v })}
				/>
				<SettingsSlider
					label="Min Score Threshold"
					description="Minimum relevance score for results"
					value={settings?.min_score_threshold || 0.1}
					min={0}
					max={1}
					step={0.05}
					onChange={(v) => updateMutation.mutate({ min_score_threshold: v })}
				/>
			</SettingsCard>
		</div>
	);
}
