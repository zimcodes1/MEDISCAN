// Define Patient Type
export interface Patient {
    id: string;
    name: string;
    hospitalId: string;
    age: number;
    sex: string;
}

export type OnboardingStep = 1 | 2;

export interface StaffMember {
  fullName: string;
  email: string;
  role: 'radiologist' | 'clinician';
}

export interface ReportHeaderProps {
	orgName: string;
	orgLogo?: string;
	reportId: string;
	reportDate: string;
}
