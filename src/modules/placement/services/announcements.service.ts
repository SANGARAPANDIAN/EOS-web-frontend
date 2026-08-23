import { apiClient } from "@/lib/api/client";
import type {
  AnnouncementListItem,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../types";

interface BackendAnnouncement {
  id: number;
  posted_by_user_id: number;
  title: string;
  content: string;
  target_audience: string;
  status: string;
  category: string | null;
  created_at: string;
  file_url: string | null;
  file_name: string | null;
  class_ids?: number[];
  class_labels?: string[];
  role_labels?: string[];
  posted_by?: { name: string; role: string; designation: string | null; department: string | null };
}

function toAnnouncement(a: BackendAnnouncement): AnnouncementListItem {
  return {
    id: a.id,
    postedByUserId: a.posted_by_user_id,
    title: a.title,
    content: a.content,
    targetAudience: a.target_audience as AnnouncementListItem["targetAudience"],
    status: a.status as AnnouncementListItem["status"],
    category: a.category,
    createdAt: a.created_at,
    fileUrl: a.file_url,
    fileName: a.file_name,
    classIds: a.class_ids ?? [],
    classLabels: a.class_labels ?? [],
    roleLabels: a.role_labels ?? [],
    postedBy: a.posted_by ?? { name: "—", role: "—", designation: null, department: null },
  };
}

export const announcementsService = {
  async list(): Promise<AnnouncementListItem[]> {
    const rows = await apiClient.get<BackendAnnouncement[]>("/announcements");
    return rows.map(toAnnouncement);
  },

  async create(input: CreateAnnouncementInput): Promise<AnnouncementListItem> {
    const row = await apiClient.post<BackendAnnouncement>("/announcements", {
      title: input.title,
      content: input.content,
      target_audience: input.targetAudience,
      class_ids: input.classIds,
      status: input.status,
      category: input.category,
    });
    return toAnnouncement(row);
  },

  async update(id: number, input: UpdateAnnouncementInput): Promise<AnnouncementListItem> {
    const row = await apiClient.patch<BackendAnnouncement>(`/announcements/${id}`, {
      title: input.title,
      content: input.content,
      target_audience: input.targetAudience,
      class_ids: input.classIds,
      status: input.status,
      category: input.category,
    });
    return toAnnouncement(row);
  },

  remove(id: number): Promise<{ id: number }> {
    return apiClient.delete<{ id: number }>(`/announcements/${id}`);
  },
};
