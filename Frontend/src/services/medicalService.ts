import api from "@/lib/api";

export interface EvolutionPhoto {
    id: number;
    photo: string; // URL
    taken_at: string; // ISO Date
    is_public: boolean;
}

export const medicalService = {
    getEvolutionPhotos: async (): Promise<EvolutionPhoto[]> => {
        const response = await api.get<EvolutionPhoto[]>('/medical/evolution/');
        return response.data;
    },

    uploadEvolutionPhoto: async (file: File): Promise<EvolutionPhoto> => {
        const formData = new FormData();
        formData.append('photo', file);

        const response = await api.post<EvolutionPhoto>('/medical/evolution/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getTelemedicineRoom: async (appointmentId: number | string) => {
        const response = await api.get(`/medical/appointments/${appointmentId}/telemedicine/`);
        return response.data;
    },

    updateClinicalData: async (appointmentId: number | string, data: any) => {
        const response = await api.patch(`/medical/appointments/${appointmentId}/clinical-data/`, data);
        return response.data;
    }
};
