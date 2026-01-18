// (c) Copyright Datacraft, 2026
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

// =====================================================
// Query Keys
// =====================================================

export const scanningProjectKeys = {
	all: ['scanning-projects'] as const,
	lists: () => [...scanningProjectKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) =>
		[...scanningProjectKeys.lists(), filters] as const,
	details: () => [...scanningProjectKeys.all, 'detail'] as const,
	detail: (id: string) => [...scanningProjectKeys.details(), id] as const,
	metrics: (id: string) => [...scanningProjectKeys.detail(id), 'metrics'] as const,
	batches: (projectId: string) => [...scanningProjectKeys.detail(projectId), 'batches'] as const,
	batch: (projectId: string, batchId: string) =>
		[...scanningProjectKeys.batches(projectId), batchId] as const,
	milestones: (projectId: string) =>
		[...scanningProjectKeys.detail(projectId), 'milestones'] as const,
	qcSamples: (projectId: string) =>
		[...scanningProjectKeys.detail(projectId), 'qc-samples'] as const,
	resources: () => [...scanningProjectKeys.all, 'resources'] as const,
	resource: (id: string) => [...scanningProjectKeys.resources(), id] as const,
};

// =====================================================
// Projects Hooks
// =====================================================

export function useScanningProjects() {
	return useQuery({
		queryKey: scanningProjectKeys.lists(),
		queryFn: api.getScanningProjects,
	});
}

export function useScanningProject(id: string) {
	return useQuery({
		queryKey: scanningProjectKeys.detail(id),
		queryFn: () => api.getScanningProject(id),
		enabled: !!id,
	});
}

export function useScanningProjectMetrics(id: string) {
	return useQuery({
		queryKey: scanningProjectKeys.metrics(id),
		queryFn: () => api.getScanningProjectMetrics(id),
		enabled: !!id,
	});
}

export function useCreateScanningProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createScanningProject,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.lists() });
		},
	});
}

export function useUpdateScanningProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: api.UpdateScanningProjectInput }) =>
			api.updateScanningProject(id, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.detail(data.id) });
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.lists() });
		},
	});
}

export function useDeleteScanningProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deleteScanningProject,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.lists() });
		},
	});
}

// =====================================================
// Batches Hooks
// =====================================================

export function useProjectBatches(projectId: string) {
	return useQuery({
		queryKey: scanningProjectKeys.batches(projectId),
		queryFn: () => api.getProjectBatches(projectId),
		enabled: !!projectId,
	});
}

export function useBatch(projectId: string, batchId: string) {
	return useQuery({
		queryKey: scanningProjectKeys.batch(projectId, batchId),
		queryFn: () => api.getBatch(projectId, batchId),
		enabled: !!projectId && !!batchId,
	});
}

export function useCreateBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ projectId, input }: { projectId: string; input: api.CreateBatchInput }) =>
			api.createBatch(projectId, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batches(data.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.detail(data.projectId),
			});
		},
	});
}

export function useUpdateBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			batchId,
			input,
		}: {
			projectId: string;
			batchId: string;
			input: api.UpdateBatchInput;
		}) => api.updateBatch(projectId, batchId, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batch(data.projectId, data.id),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batches(data.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.metrics(data.projectId),
			});
		},
	});
}

export function useStartBatchScan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ projectId, batchId }: { projectId: string; batchId: string }) =>
			api.startBatchScan(projectId, batchId),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batch(data.projectId, data.id),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batches(data.projectId),
			});
		},
	});
}

export function useCompleteBatchScan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			batchId,
			actualPages,
		}: {
			projectId: string;
			batchId: string;
			actualPages: number;
		}) => api.completeBatchScan(projectId, batchId, actualPages),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batch(data.projectId, data.id),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.batches(data.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.metrics(data.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.detail(data.projectId),
			});
		},
	});
}

// =====================================================
// Milestones Hooks
// =====================================================

export function useProjectMilestones(projectId: string) {
	return useQuery({
		queryKey: scanningProjectKeys.milestones(projectId),
		queryFn: () => api.getProjectMilestones(projectId),
		enabled: !!projectId,
	});
}

export function useCreateMilestone() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			input,
		}: {
			projectId: string;
			input: api.CreateMilestoneInput;
		}) => api.createMilestone(projectId, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.milestones(data.projectId),
			});
		},
	});
}

export function useUpdateMilestone() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			milestoneId,
			input,
		}: {
			projectId: string;
			milestoneId: string;
			input: api.UpdateMilestoneInput;
		}) => api.updateMilestone(projectId, milestoneId, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.milestones(data.projectId),
			});
		},
	});
}

// =====================================================
// Quality Control Hooks
// =====================================================

export function usePendingQCSamples(projectId: string) {
	return useQuery({
		queryKey: scanningProjectKeys.qcSamples(projectId),
		queryFn: () => api.getPendingQCSamples(projectId),
		enabled: !!projectId,
	});
}

export function useCreateQCSample() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			input,
		}: {
			projectId: string;
			input: api.CreateQCSampleInput;
		}) => api.createQCSample(projectId, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.qcSamples(data.batchId),
			});
		},
	});
}

export function useUpdateQCSample() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			sampleId,
			input,
		}: {
			projectId: string;
			sampleId: string;
			input: api.UpdateQCSampleInput;
		}) => api.updateQCSample(projectId, sampleId, input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.qcSamples(variables.projectId),
			});
			queryClient.invalidateQueries({
				queryKey: scanningProjectKeys.metrics(variables.projectId),
			});
		},
	});
}

// =====================================================
// Resources Hooks
// =====================================================

export function useResources() {
	return useQuery({
		queryKey: scanningProjectKeys.resources(),
		queryFn: api.getResources,
	});
}

export function useResource(id: string) {
	return useQuery({
		queryKey: scanningProjectKeys.resource(id),
		queryFn: () => api.getResource(id),
		enabled: !!id,
	});
}

export function useCreateResource() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createResource,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.resources() });
		},
	});
}

export function useUpdateResource() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: api.UpdateResourceInput }) =>
			api.updateResource(id, input),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.resource(data.id) });
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.resources() });
		},
	});
}

export function useDeleteResource() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deleteResource,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.resources() });
		},
	});
}
