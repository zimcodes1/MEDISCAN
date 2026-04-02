import api, { extractApiErrors, getApiErrorMessage } from './api';
import { setTokens } from './storage';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
    organisation: {
      id: number;
      name: string;
      logo: string | null;
    } | null;
  };
}

export const login = async ({ email, password }: LoginPayload) => {
  const { data } = await api.post<LoginResponse>('/auth/login/', {
    email,
    password,
  });

  if (data.access && data.refresh) {
    setTokens(data.access, data.refresh);
  }

  return data;
};

export interface OrganisationSignupForm {
  organisationName: string;
  organisationType: string;
  state: string;
  workEmail: string;
  adminFullName: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
}

export interface OrganisationRegistrationPayload {
  organisation_name: string;
  organisation_type: string;
  state: string;
  phone: string;
  admin_email: string;
  admin_full_name: string;
  admin_job_title?: string;
  password: string;
  password2: string;
}

export interface OrganisationRegistrationResponse {
  message: string;
  organisation_id: number;
  admin_email: string;
}

const toStateSlug = (state: string) =>
  state.toLowerCase().replace(/\s+/g, '_').replace('fct', 'fct');

export const mapOrganisationSignupToPayload = (
  formData: OrganisationSignupForm,
): OrganisationRegistrationPayload => ({
  organisation_name: formData.organisationName,
  organisation_type: formData.organisationType,
  state: toStateSlug(formData.state),
  phone: formData.phoneNumber,
  admin_email: formData.workEmail,
  admin_full_name: formData.adminFullName,
  password: formData.password,
  password2: formData.confirmPassword,
});

export const registerOrganisation = async (payload: OrganisationRegistrationPayload) => {
  const { data } = await api.post<OrganisationRegistrationResponse>(
    '/auth/organisations/register/',
    payload,
  );
  return data;
};

const registrationFieldMap: Record<string, keyof OrganisationSignupForm> = {
  organisation_name: 'organisationName',
  organisation_type: 'organisationType',
  state: 'state',
  phone: 'phoneNumber',
  admin_email: 'workEmail',
  admin_full_name: 'adminFullName',
  password: 'password',
  password2: 'confirmPassword',
};

export const mapRegistrationErrors = (error: unknown) => {
  const errors: Record<string, string> = {};
  const data = extractApiErrors(error);

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      const field = registrationFieldMap[key] ?? key;
      const message = Array.isArray(value)
        ? String(value[0] ?? '')
        : typeof value === 'string'
          ? value
          : '';
      if (message) {
        errors[field] = message;
      }
    });
  }

  if (Object.keys(errors).length === 0) {
    errors.submit = getApiErrorMessage(error, 'Failed to create account. Please try again.');
  }

  return errors;
};
