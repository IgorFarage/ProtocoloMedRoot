import api from "@/lib/api";

export interface EvolutionPhoto {
    id: number;
    photo: string; // URL
    taken_at: string; // ISO Date
    is_public: boolean;
}

export interface PastAppointment {
    id: number;
    date: string;
    doctor_name: string;
    clinical_notes: string | null;
    prescription_data: any | null;
    exam_request_data: any | null;
}

export interface PatientDetails {
    id: string;
    name: string;
    age: string;
    photo: string;
    riskStatus: string;
    anamnesis: { question: string; answer: string }[];
    currentProtocol: {
        name: string;
        medications: string[];
    };
    past_appointments: PastAppointment[];
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

    getTelemedicineRoom: async (appointmentId: string): Promise<{ meetingId: string, token: string, isOwner: boolean, patientId?: string, patientName?: string, appointmentId: string }> => {
        const response = await api.get(`/medical/appointments/${appointmentId}/telemedicine/`);
        return {
            meetingId: response.data.room_url,
            token: response.data.token,
            isOwner: response.data.is_owner,
            patientId: response.data.patient_id,
            patientName: response.data.patient_name,
            appointmentId: response.data.appointment_id
        };
    },

    saveClinicalNotes: async (appointmentId: string, clinicalNotes: string): Promise<any> => {
        const response = await api.patch(`/medical/appointments/${appointmentId}/clinical-data/`, {
            clinical_notes: clinicalNotes
        });
        return response.data;
    },

    savePrescriptionData: async (appointmentId: string, prescriptionData: any): Promise<any> => {
        const response = await api.patch(`/medical/appointments/${appointmentId}/clinical-data/`, {
            prescription_data: prescriptionData
        });
        return response.data;
    },

    saveExamRequestData: async (appointmentId: string, examData: any): Promise<any> => {
        const response = await api.patch(`/medical/appointments/${appointmentId}/clinical-data/`, {
            exam_request_data: examData
        });
        return response.data;
    },

    updateClinicalData: async (appointmentId: number | string, data: any) => {
        const response = await api.patch(`/medical/appointments/${appointmentId}/clinical-data/`, data);
        return response.data;
    },

    getPatientDetails: async (patientId: string): Promise<PatientDetails> => {
        const response = await api.get<PatientDetails>(`/medical/doctor/patients/${patientId}/details/`);
        return response.data;
    }
};
