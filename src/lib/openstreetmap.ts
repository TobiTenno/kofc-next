export const buildOsmSearchUrl = (query: string): string =>
  `https://www.openstreetmap.org/search?query=${encodeURIComponent(query.trim())}`;

export type PostalAddress = {
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  zipCode: string;
};

export const formatPostalAddress = (address: PostalAddress): string => {
  const streetLine = address.street2?.trim()
    ? `${address.street}, ${address.street2.trim()}`
    : address.street;

  return `${streetLine}, ${address.city}, ${address.state} ${address.zipCode}`;
};
