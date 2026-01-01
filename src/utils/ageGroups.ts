// Age group definitions for 4H Cat Voting System

export interface AgeGroup {
  value: string;
  label: string;
}

export const OWNER_AGE_GROUPS: AgeGroup[] = [
  { value: 'cloverbuds', label: 'Cloverbuds (5-7 years)' },
  { value: 'junior', label: 'Junior (8-10 years)' },
  { value: 'intermediate', label: 'Intermediate (11-13 years)' },
  { value: 'senior', label: 'Senior (14-18 years)' },
];

export const CAT_AGE_GROUPS: AgeGroup[] = [
  { value: 'kitten', label: 'Kitten (under 8 months)' },
  { value: 'junior', label: 'Junior (8 months - 2 years)' },
  { value: 'adult', label: 'Adult (2-7 years)' },
  { value: 'senior', label: 'Senior (7+ years)' },
];

export const getOwnerAgeGroupLabel = (value: string): string => {
  return OWNER_AGE_GROUPS.find(group => group.value === value)?.label || value;
};

export const getCatAgeGroupLabel = (value: string): string => {
  return CAT_AGE_GROUPS.find(group => group.value === value)?.label || value;
};