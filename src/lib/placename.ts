import { z } from "zod";

/** The address parts of an OpenStreetMap reverse-lookup result that we use. */
export const AddressSchema = z.object({
  suburb: z.string().optional(),
  neighbourhood: z.string().optional(),
  quarter: z.string().optional(),
  city_district: z.string().optional(),
  village: z.string().optional(),
  town: z.string().optional(),
  city: z.string().optional(),
  municipality: z.string().optional(),
  county: z.string().optional(),
  state_district: z.string().optional(),
  state: z.string().optional(),
  country_code: z.string().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

const unique = (list: (string | undefined)[]): string[] =>
  list.filter((p, i, all): p is string => !!p && all.indexOf(p) === i);

/** "Raisina Hill, New Delhi" (short) and "Raisina Hill, New Delhi, Delhi" (full), or null with no usable name. */
export function placeName(a: Address): { name: string; short: string } | null {
  const area = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district;
  const town = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state_district;
  const parts = unique([area, town]);
  if (parts.length === 0 && a.state) parts.push(a.state);
  if (parts.length === 0) return null;
  return {
    short: parts.join(", ").slice(0, 60),
    name: unique([...parts, a.state])
      .join(", ")
      .slice(0, 100),
  };
}
