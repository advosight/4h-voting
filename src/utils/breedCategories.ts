// 4-H cat show breed category definitions

export interface BreedCategory {
  value: string;
  label: string;
}

export const BREED_CATEGORIES: BreedCategory[] = [
  { value: 'domestic_shorthair', label: 'Domestic Shorthair' },
  { value: 'domestic_longhair', label: 'Domestic Longhair' },
  { value: 'purebred_shorthair', label: 'Purebred Shorthair' },
  { value: 'purebred_longhair', label: 'Purebred Longhair' },
];

export const getBreedCategoryLabel = (value: string): string => {
  return BREED_CATEGORIES.find(category => category.value === value)?.label || value;
};
