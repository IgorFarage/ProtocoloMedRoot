export interface DoctorInfo {
    name: string;
    email: string;
    crm: string;
    specialty: string;
    specialty_type?: string;
    photo?: string;
}

export interface DoctorStats {
    total_patients: number;
    appointments_today: number;
}

export interface Patient {
    id: string;
    name: string;
    lastVisit: string;
    riskLevel: 'Baixo' | 'Moderado' | 'Alto';
    nextAppointment: string;
    email: string;
    myRole?: string;
}
