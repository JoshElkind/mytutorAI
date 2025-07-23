export interface Resource {
  id: string;
  name: string;
  resourceType: string;
  fileUrl?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  createdAt: string;
  wordCount?: number;
  charCount?: number;
  pdfPreviewUrl?: string;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  resourceIds: string[];
  resources?: Resource[];
  createdAt: string;
}

export const RESOURCE_TYPES = ['learning', 'worksheet', 'quiz'] as const;
export type ResourceType = typeof RESOURCE_TYPES[number]; 