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

export type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export type GeocodeOptions = {
  q: string;
  addressdetails?: boolean;
  countrycodes?: string[];
  limit?: number;
};

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

export async function geocode(
  options: GeocodeOptions,
): Promise<NominatimSearchResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: options.q,
  });

  if (options.addressdetails) {
    params.set('addressdetails', '1');
  }

  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }

  if (options.countrycodes?.length) {
    params.set('countrycodes', options.countrycodes.join(','));
  }

  const response = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Nominatim geocode failed: ${response.status}`);
  }

  return response.json() as Promise<NominatimSearchResult[]>;
}
