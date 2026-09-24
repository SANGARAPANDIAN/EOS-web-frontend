import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CanteenSettings {
  gst_percentage: number;
  parcel_charge: number;
  updated_at: string;
}

export interface UpdateCanteenSettingsInput {
  gst_percentage?: number;
  parcel_charge?: number;
}

const settingsKey = ["canteen-admin", "settings"] as const;

/** GET /canteen-admin/settings */
export function useCanteenSettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => apiClient.get<CanteenSettings>("/canteen-admin/settings"),
  });
}

/** PATCH /canteen-admin/settings */
export function useUpdateCanteenSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCanteenSettingsInput) => apiClient.patch<CanteenSettings>("/canteen-admin/settings", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKey });
      queryClient.invalidateQueries({ queryKey: ["canteen-cashier", "settings"] });
    },
  });
}
