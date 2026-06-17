// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';

export function useBulkDownloadZip() {
  return useMutation({
    mutationFn: async (nodeIds: string[]) => {
      const response = await apiClient.post(
        '/nodes/bulk/download-zip',
        { node_ids: nodeIds },
        { responseType: 'blob' },
      );
      // trigger browser download
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'documents.zip';
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
