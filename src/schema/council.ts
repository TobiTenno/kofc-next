import { z } from 'zod';

const Address = z.object({
  city: z.string().min(1),
  state: z.string().min(1).length(2),
  street: z.string().min(1),
  street2: z.string().optional(),
  zipCode: z.string().min(5).max(10),
});

const Contact = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  website: z.string().url().optional(),
});

export enum Position {
  Advocate = 'Advocate',
  Chancellor = 'Chancellor',
  Chaplain = 'Chaplain',
  DeputyGrandKnight = 'Deputy Grand Knight',
  DistrictDeputy = 'District Deputy',
  FinancialSecretary = 'Financial Secretary',
  GrandKnight = 'Grand Knight',
  InsideGuard = 'Inside Guard',
  Lecturer = 'Lecturer',
  OutsideGuard = 'Outside Guard',
  Recorder = 'Recorder',
  Treasurer = 'Treasurer',
  TrusteeOneYear = 'Trustee (1 Year)',
  TrusteeThreeYear = 'Trustee (3 Year)',
  TrusteeTwoYear = 'Trustee (2 Year)',
  Warden = 'Warden',
}

export const ALL_OFFICER_POSITIONS = Object.values(Position) as Position[];

export const ImageName: Record<Position, string> = {
  [Position.Advocate]: '/medals/advocate.jpg',
  [Position.Chancellor]: '/medals/chancellor.jpg',
  [Position.Chaplain]: '/medals/chaplain.jpg',
  [Position.DeputyGrandKnight]: '/medals/deputy_grand_knight.jpg',
  [Position.DistrictDeputy]: '/medals/district_deputy.jpg',
  [Position.FinancialSecretary]: '/medals/financial_secretary.jpg',
  [Position.GrandKnight]: '/medals/grand_knight.jpg',
  [Position.InsideGuard]: '/medals/inside_guard.jpg',
  [Position.Lecturer]: '/medals/lecturer.jpg',
  [Position.OutsideGuard]: '/medals/outside_guard.jpg',
  [Position.Recorder]: '/medals/recorder.jpg',
  [Position.Treasurer]: '/medals/treasurer.jpg',
  [Position.TrusteeOneYear]: '/medals/trustee.jpg',
  [Position.TrusteeThreeYear]: '/medals/trustee.jpg',
  [Position.TrusteeTwoYear]: '/medals/trustee.jpg',
  [Position.Warden]: '/medals/warden.jpg',
};

// Define a schema for council configuration data
export const CouncilSchema = z.object({
  address: Address,
  contact: Contact.optional(),
  id: z.uuidv7(),
  meetingLocation: Address.optional(),
  meetingTimes: z.object({
    council: z.object({
      day: z.string().min(1),
      frequency: z.string().min(1),
      time: z.string().min(1),
    }),
    officers: z.object({
      day: z.string().min(1),
      frequency: z.string().min(1),
      time: z.string().min(1),
    }),
  }),
  name: z.string().min(1).optional(),
  number: z.number().int().positive(),
  officers: z
    .array(
      z.object({
        avatar: z.string().url().optional(),
        email: z.string().email().optional(),
        membershipNumber: z.string().min(1).optional(),
        name: z.string().min(1),
        phone: z.string().min(10).max(15).optional(),
        position: z.enum(Position),
        termEnd: z.string().optional(),
      }),
    )
    .optional(),
  parish: Address.extend({ name: z.string().min(1) }),
});

export const CouncilConfigSchema = z.object({
  complete: z.boolean().optional(),
  council: CouncilSchema.optional(),
  dues: z
    .object({
      councilYear: z.string(),
      currency: z.string().default('USD'),
      paypalBusinessEmail: z.string().email(),
      paypalClientId: z.string().optional(),
      paypalClientSecret: z.string().optional(),
      paypalMode: z.enum(['sandbox', 'live']).optional(),
      paypalPlans: z.record(z.string(), z.string()).optional(),
      paypalProductId: z.string().optional(),
      paypalSubSyncIntervalMs: z.number().int().positive().optional(),
      paypalWebhookId: z.string().optional(),
      rates: z.record(z.string(), z.number().int().positive()),
    })
    .optional(),
  errorMessage: z.string().optional(),
  integrations: z
    .object({
      immich: z
        .object({
          apiKey: z.string().min(1),
          deviceId: z.string().optional(),
          maxUploadMb: z.number().int().positive().optional(),
          uploadApiKey: z.string().optional(),
          url: z.string().url(),
        })
        .optional(),
    })
    .optional(),
  permissions: z
    .object({
      manageDues: z.array(z.string()).default([]),
      manageEvents: z.array(z.string()).default([]),
      manageGalleries: z.array(z.string()).default([]),
      manageOfficers: z.array(z.string()).default([]),
      managePermissions: z.array(z.string()).default([]),
      manageRoster: z.array(z.string()).default([]),
      sendCouncilEmail: z.array(z.string()).default([]),
      viewAuditLog: z.array(z.string()).default([]),
    })
    .optional(),
  webmaster: z
    .object({
      membershipNumber: z.string(),
    })
    .optional(),
});
