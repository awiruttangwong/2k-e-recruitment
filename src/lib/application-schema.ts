import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

// Optional numeric fields come from text/number inputs that yield "" when the
// user leaves them blank. `z.coerce.number("")` is 0 — which silently stores 0
// for blank fields and, worse, fails `.positive()` so the whole form can't be
// submitted while the field is empty. This guard maps ""/null/undefined (and
// comma-grouped values like "12,345") to undefined BEFORE the inner rules run,
// so a blank optional number is genuinely absent rather than a coerced 0.
function optionalNumber(inner: z.ZodNumber) {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const clean = String(val).replace(/,/g, "");
    return clean === "" ? undefined : Number(clean);
  }, inner.optional());
}

export const PHOTO_MAX_DATA_URL_CHARS = 200_000;

// An applicant-uploaded org-chart image is downscaled + re-encoded client-side
// (see lib/org-chart-image.ts) to stay under this. ~1M chars ≈ 730 KB binary —
// 5× the 1-inch photo's budget, enough for a detailed chart, still a safe D1 row.
export const ORG_CHART_IMAGE_MAX_DATA_URL_CHARS = 1_000_000;

// PNG (computer-drawn line art) or JPEG (photographic/shaded charts); the client
// picks whichever keeps the file under the cap. Mirrors optionalPhotoDataUrl.
const optionalOrgChartImage = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(val), {
    message: "รูปผังองค์กรไม่ถูกต้อง",
  })
  .refine((val) => !val || val.length <= ORG_CHART_IMAGE_MAX_DATA_URL_CHARS, {
    message: "ไฟล์รูปผังองค์กรใหญ่เกินไป",
  });

const optionalPhotoDataUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(val), {
    message: "รูปถ่ายไม่ถูกต้อง",
  })
  .refine((val) => !val || val.length <= PHOTO_MAX_DATA_URL_CHARS, {
    message: "ไฟล์รูปถ่ายใหญ่เกินไป",
  });

const optionalThaiDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => {
      if (!val) return true;
      const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return false;
      const dd = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10);
      const yyyy = parseInt(match[3], 10);
      return dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy > 2200;
    },
    { message: "รูปแบบวันที่ไม่ถูกต้อง (วว/ดด/ปปปป พ.ศ.)" }
  );

const requiredThaiDate = (emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .refine(
      (val) => {
        const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return false;
        const dd = parseInt(match[1], 10);
        const mm = parseInt(match[2], 10);
        const yyyy = parseInt(match[3], 10);
        return dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy > 2200;
      },
      { message: "รูปแบบวันที่ไม่ถูกต้อง (วว/ดด/ปปปป พ.ศ.)" }
    );

// Rows in repeatable sections (siblings, trainings, work experience,
// references) start as blank placeholders the user is free to leave empty —
// they're only required to fill the primary field once they've touched any
// other field in that row. Fully-blank rows validate cleanly and get
// filtered out before submission (see application-schema usage in the form).
function requirePrimaryIfRowTouched<T extends Record<string, unknown>>(
  primaryKey: keyof T,
  message: string
) {
  return (row: T, ctx: z.RefinementCtx) => {
    const hasAnyValue = Object.entries(row).some(([key, value]) => {
      if (key === primaryKey) return false;
      if (typeof value === "boolean") return value === true;
      return value !== undefined && value !== null && value !== "";
    });
    if (hasAnyValue && !row[primaryKey]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [primaryKey as string], message });
    }
  };
}

/** True when every field in a repeatable-section row is empty/default —
 *  used to drop untouched placeholder rows before they're persisted. */
export function isBlankRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) => {
    if (typeof value === "boolean") return value === false;
    return value === undefined || value === null || value === "";
  });
}

export const siblingSchema = z
  .object({
    name: optionalText,
    age: optionalNumber(z.number().int().positive()),
    occupation: optionalText,
  })
  .superRefine(requirePrimaryIfRowTouched("name", "กรุณากรอกชื่อ"));

export const educationSchema = z.object({
  level: z.enum(["high_school", "vocational", "diploma", "bachelor", "master", "other"]),
  institution: optionalText,
  major: optionalText,
  yearFrom: optionalText,
  yearTo: optionalText,
  gpa: optionalNumber(z.number().min(0).max(4)),
});

export const trainingSchema = z
  .object({
    institution: optionalText,
    course: optionalText,
    dateFrom: optionalThaiDate,
    dateTo: optionalThaiDate,
    hasCertificate: z.boolean().default(false),
  })
  .superRefine(requirePrimaryIfRowTouched("institution", "กรุณากรอกชื่อสถาบัน"));


export const workExperienceSchema = z
  .object({
    company: optionalText,
    dateFrom: optionalThaiDate,
    dateTo: optionalThaiDate,
    position: optionalText,
    jobDescription: optionalText,
    salary: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        const clean = String(val).replace(/,/g, "");
        return clean === "" ? undefined : Number(clean);
      },
      z.number().nonnegative().max(99999, "ค่าจ้างต้องไม่เกิน 99,999 บาท").optional()
    ),
    reasonForLeaving: optionalText,
  })
  .superRefine(requirePrimaryIfRowTouched("company", "กรุณากรอกชื่อบริษัท"));

const skillLevel = z.enum(["good", "fair", "poor"]).optional();

export const languageSkillSchema = z.object({
  language: z.enum(["thai", "english", "other"]),
  languageOther: optionalText,
  listening: skillLevel,
  reading: skillLevel,
  writing: skillLevel,
});

export const referenceSchema = z
  .object({
    name: optionalText,
    address: optionalText,
    phone: optionalText,
    occupation: optionalText,
  })
  .superRefine(requirePrimaryIfRowTouched("name", "กรุณากรอกชื่อผู้อ้างอิง"));

export const applicationFormSchema = z.object({
  // Letterhead photo (optional — applicants without one leave the box blank
  // and attach a printed photo instead). The browser downscales to a 300×420
  // JPEG before this is ever sent, so anything arriving here that isn't a
  // small JPEG data URL didn't come from our form: this endpoint is public and
  // unauthenticated, and without the cap a crafted POST could push megabytes
  // into the D1 row. 200k chars ≈ 150 KB of JPEG, ~4× the real-world size.
  photoDataUrl: optionalPhotoDataUrl,

  // Position applied for
  firstName: z.string().trim().min(1, "กรุณากรอกชื่อ"),
  lastName: z.string().trim().min(1, "กรุณากรอกนามสกุล"),
  nickname: optionalText,
  positionApplied1: z.string().trim().min(1, "กรุณากรอกตำแหน่งที่ต้องการ"),
  positionApplied2: optionalText,
  availableStartDate: optionalThaiDate,
  expectedSalary: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const clean = String(val).replace(/,/g, "");
      return clean === "" ? undefined : Number(clean);
    },
    z.number().nonnegative().max(99999, "เงินเดือนต้องไม่เกิน 99,999 บาท").optional()
  ),

  // Address
  addressNo: optionalText,
  moo: optionalText,
  road: optionalText,
  subDistrict: optionalText,
  district: optionalText,
  province: optionalText,
  postalCode: optionalText,

  // Contact
  phone: optionalText,
  mobile: z.string().trim().min(9, "กรุณากรอกเบอร์มือถือให้ถูกต้อง"),
  lineId: optionalText,
  email: z.string().trim().email("อีเมลไม่ถูกต้อง"),
  socialMedia: optionalText,

  livingWith: z.enum(["parent", "own_home", "rented_house", "dorm"]).optional(),

  // Personal info
  dateOfBirth: requiredThaiDate("กรุณากรอกวันเกิด"),
  age: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(10, "อายุต้องเป็นตัวเลข 2 หลัก (10 - 60 ปี)").max(60, "อายุต้องไม่เกิน 60 ปี").optional()
  ),
  chineseZodiac: optionalText,
  race: optionalText,
  nationality: optionalText,
  religion: optionalText,
  idCardNumber: z
    .string()
    .trim()
    .refine(
      (val) => val.replace(/[^0-9]/g, "").length === 13,
      { message: "เลขบัตรประชาชนไม่ถูกต้อง" }
    ),
  idCardExpiry: optionalThaiDate,
  heightCm: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(100, "ส่วนสูงต้องเป็นหลักร้อย (100 - 200 ซม.)").max(200, "ส่วนสูงต้องไม่เกิน 200 ซม.").optional()
  ),
  weightKg: optionalNumber(z.number().positive()),
  militaryStatus: z.enum(["exempted", "served", "not_yet_served"]).optional(),
  maritalStatus: z.enum(["single", "married", "widowed", "separated"]).optional(),
  sex: z.enum(["male", "female"]).optional(),

  everPracticedDharma: z.boolean().default(false),
  dharmaPlace: optionalText,
  dharmaDuration: optionalText,

  docIdCard: z.boolean().default(false),
  docHouseRegistration: z.boolean().default(false),
  docPassport: z.boolean().default(false),
  docEducationCert: z.boolean().default(false),
  docWorkCert: z.boolean().default(false),
  docOther: optionalText,

  // Family
  fatherName: optionalText,
  fatherAge: optionalNumber(z.number().int().positive()),
  fatherOccupation: optionalText,
  motherName: optionalText,
  motherAge: optionalNumber(z.number().int().positive()),
  motherOccupation: optionalText,
  spouseName: optionalText,
  spouseWorkplace: optionalText,
  spousePosition: optionalText,
  numberOfChildren: optionalNumber(z.number().int().nonnegative()),
  numberOfSiblings: optionalNumber(z.number().int().nonnegative()),
  numberOfBrothers: optionalNumber(z.number().int().nonnegative()),
  numberOfSisters: optionalNumber(z.number().int().nonnegative()),
  childOrder: optionalNumber(z.number().int().positive()),
  siblings: z.array(siblingSchema).default([]),

  education: z.array(educationSchema).default([]),
  trainings: z.array(trainingSchema).default([]),
  workExperience: z.array(workExperienceSchema).default([]),
  languageSkills: z.array(languageSkillSchema).default([]),

  // Special ability
  typingSpeedThai: optionalNumber(z.number().int().nonnegative()),
  typingSpeedEnglish: optionalNumber(z.number().int().nonnegative()),
  touchTyping: z.boolean().default(false),
  computerSkills: z.boolean().default(false),
  computerSkillsDetail: optionalText,
  carDriver: z.boolean().default(false),
  hasOwnCar: z.boolean().default(false),
  carLicenseNo: optionalText,
  motorcycleDriver: z.boolean().default(false),
  hasOwnMotorcycle: z.boolean().default(false),
  motorcycleLicenseNo: optionalText,
  officeMachineSkills: optionalText,
  hobbies: optionalText,
  canWorkUpCountry: z.boolean().default(false),
  canWorkUpCountryOther: optionalText,

  // Additional info
  emergencyContactName: z.string().trim().min(1, "กรุณากรอกชื่อผู้ติดต่อฉุกเฉิน"),
  emergencyContactRelation: optionalText,
  emergencyContactAddress: optionalText,
  emergencyContactPhone: z.string().trim().min(1, "กรุณากรอกเบอร์โทรผู้ติดต่อฉุกเฉิน"),
  jobInfoSource: optionalText,
  infoSource: z.enum(["internet", "announcement", "friend", "other"]).optional(),
  infoSourceInternetDetail: optionalText,
  infoSourceDetail: optionalText,
  seriousIllness: z.boolean().default(false),
  illnessDetail: optionalText,
  appliedBefore: z.boolean().default(false),
  appliedBeforeWhen: optionalText,
  relativesInCompany: optionalText,
  references: z.array(referenceSchema).default([]),
  selfIntroduction: optionalText,

  orgChartDescription: optionalText,
  // The applicant's own uploaded chart image, an alternative to the drag-and-drop
  // builder's vector data (orgChartDescription). Mutually exclusive in the UI.
  orgChartImageDataUrl: optionalOrgChartImage,
  jobResponsibilities: optionalText,

  signatureDataUrl: optionalText,
  signedDate: requiredThaiDate("กรุณาระบุวันที่"),

  consentTruthful: z.literal(true, {
    message: "กรุณายืนยันว่าข้อมูลที่ให้ไว้เป็นความจริง",
  }),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
