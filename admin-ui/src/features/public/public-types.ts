export type PublicLeadForm = {
  name: string;
  phone: string;
  objectType: string;
  area: string;
  packageType: string;
  contactMethod: string;
  comment: string;
  personalDataConsent: boolean;
};

export type PublicContactMethodOption = {
  value: string;
  label: string;
};
