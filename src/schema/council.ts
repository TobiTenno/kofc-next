import { z } from 'zod';

const Address = z.object({
  street: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1).length(2),
  zipCode: z.string().min(5).max(10),
});

const Contact = z.object({
  phone: z.string().min(10).max(15),
  email: z.string().email(),
  website: z.string().url().optional(),
});

export enum Position {
  GrandKnight = 'Grand Knight',
  DeputyGrandKnight = 'Deputy Grand Knight',
  Chancellor = 'Chancellor',
  FinancialSecretary = 'Financial Secretary',
  Recorder = 'Recorder',
  Treasurer = 'Treasurer',
  Advocate = 'Advocate',
  Warden = 'Warden',
  InsideGuard = 'Inside Guard',
  OutsideGuard = 'Outside Guard',
  TrusteeOneYear = 'Trustee (1 Year)',
  TrusteeTwoYear = 'Trustee (2 Year)',
  TrusteeThreeYear = 'Trustee (3 Year)',
  Chaplain = 'Chaplain',
  Lecturer = 'Lecturer',
  DistrictDeputy = 'District Deputy',
}

export const ImageName: Record<Position, string> = {
  [Position.GrandKnight]: '/medals/grand_knight.jpg',
  [Position.DeputyGrandKnight]: '/medals/deputy_grand_knight.jpg',
  [Position.Chancellor]: '/medals/chancellor.jpg',
  [Position.FinancialSecretary]: '/medals/financial_secretary.jpg',
  [Position.Recorder]: '/medals/recorder.jpg',
  [Position.Treasurer]: '/medals/treasurer.jpg',
  [Position.Advocate]: '/medals/advocate.jpg',
  [Position.Warden]: '/medals/warden.jpg',
  [Position.InsideGuard]: '/medals/inside_guard.jpg',
  [Position.OutsideGuard]: '/medals/outside_guard.jpg',
  [Position.TrusteeOneYear]: '/medals/trustee.jpg',
  [Position.TrusteeTwoYear]: '/medals/trustee.jpg',
  [Position.TrusteeThreeYear]: '/medals/trustee.jpg',
  [Position.Chaplain]: '/medals/chaplain.jpg',
  [Position.Lecturer]: '/medals/lecturer.jpg',
  [Position.DistrictDeputy]: '/medals/district_deputy.jpg',
};

// Define a schema for council configuration data
export const CouncilSchema = z.object({
  name: z.string().min(1).optional(),
  id: z.uuidv7(),
  number: z.number().int().positive(),
  address: Address,
  parish: Address.extend({ name: z.string().min(1) }),
  meetingLocation: Address.optional(),
  contact: Contact.optional(),
  meetingTimes: z.object({
    council: z.object({
      day: z.string().min(1),
      time: z.string().min(1),
      frequency: z.string().min(1),
    }),
    officers: z.object({
      day: z.string().min(1),
      time: z.string().min(1),
      frequency: z.string().min(1),
    }),
  }),
  officers: z
    .array(
      z.object({
        avatar: z.string().url().optional(),
        name: z.string().min(1),
        position: z.enum(Position),
        termEnd: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().min(10).max(15).optional(),
      }),
    )
    .optional(),
});

export const CouncilConfigSchema = z.object({
  council: CouncilSchema.optional(),
  webmaster: z
    .object({
      membershipNumber: z.string(),
    })
    .optional(),
  permissions: z
    .object({
      sendCouncilEmail: z.array(z.string()).default([]),
      managePermissions: z.array(z.string()).default([]),
      manageEvents: z.array(z.string()).default([]),
      manageGalleries: z.array(z.string()).default([]),
    })
    .optional(),
  dues: z
    .object({
      councilYear: z.string(),
      rates: z.record(z.string(), z.number().int().positive()),
      currency: z.string().default('USD'),
      paypalBusinessEmail: z.string().email(),
    })
    .optional(),
  complete: z.boolean().optional(),
  errorMessage: z.string().optional(),
});
