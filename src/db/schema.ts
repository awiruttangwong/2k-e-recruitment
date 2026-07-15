import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Main application form — mirrors 2KL FM-HR-03 "ใบสมัครงาน" (Application for Employment)

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  status: text("status", { enum: ["submitted", "reviewing", "interview", "hired", "rejected"] })
    .default("submitted")
    .notNull(),

  // Position applied for
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  nickname: text("nickname"),
  positionApplied1: text("position_applied_1").notNull(),
  positionApplied2: text("position_applied_2"),
  availableStartDate: text("available_start_date"),
  expectedSalary: real("expected_salary"),

  // Personal information — address
  addressNo: text("address_no"),
  moo: text("moo"),
  road: text("road"),
  subDistrict: text("sub_district"),
  district: text("district"),
  province: text("province"),
  postalCode: text("postal_code"),

  // Contact
  phone: text("phone"),
  mobile: text("mobile").notNull(),
  lineId: text("line_id"),
  email: text("email").notNull(),
  socialMedia: text("social_media"),

  livingWith: text("living_with", { enum: ["parent", "own_home", "rented_house", "dorm"] }),

  // Personal info
  dateOfBirth: text("date_of_birth").notNull(),
  age: integer("age"),
  chineseZodiac: text("chinese_zodiac"),
  race: text("race"),
  nationality: text("nationality"),
  religion: text("religion"),
  idCardNumber: text("id_card_number").notNull(),
  idCardExpiry: text("id_card_expiry"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  militaryStatus: text("military_status", { enum: ["exempted", "served", "not_yet_served"] }),
  maritalStatus: text("marital_status", { enum: ["single", "married", "widowed", "separated"] }),
  sex: text("sex", { enum: ["male", "female"] }),

  everPracticedDharma: integer("ever_practiced_dharma", { mode: "boolean" }).default(false),
  dharmaPlace: text("dharma_place"),
  dharmaDuration: text("dharma_duration"),

  // Documents submitted (checkboxes)
  docIdCard: integer("doc_id_card", { mode: "boolean" }).default(false),
  docHouseRegistration: integer("doc_house_registration", { mode: "boolean" }).default(false),
  docPassport: integer("doc_passport", { mode: "boolean" }).default(false),
  docEducationCert: integer("doc_education_cert", { mode: "boolean" }).default(false),
  docWorkCert: integer("doc_work_cert", { mode: "boolean" }).default(false),
  docOther: text("doc_other"),

  // Family information
  fatherName: text("father_name"),
  fatherAge: integer("father_age"),
  fatherOccupation: text("father_occupation"),
  motherName: text("mother_name"),
  motherAge: integer("mother_age"),
  motherOccupation: text("mother_occupation"),
  spouseName: text("spouse_name"),
  spouseWorkplace: text("spouse_workplace"),
  spousePosition: text("spouse_position"),
  numberOfChildren: integer("number_of_children").default(0),
  numberOfSiblings: integer("number_of_siblings"),
  numberOfBrothers: integer("number_of_brothers"),
  numberOfSisters: integer("number_of_sisters"),
  childOrder: integer("child_order"),

  // Special ability
  typingSpeedThai: integer("typing_speed_thai"),
  typingSpeedEnglish: integer("typing_speed_english"),
  touchTyping: integer("touch_typing", { mode: "boolean" }).default(false),
  computerSkills: integer("computer_skills", { mode: "boolean" }).default(false),
  computerSkillsDetail: text("computer_skills_detail"),
  carDriver: integer("car_driver", { mode: "boolean" }).default(false),
  hasOwnCar: integer("has_own_car", { mode: "boolean" }).default(false),
  carLicenseNo: text("car_license_no"),
  motorcycleDriver: integer("motorcycle_driver", { mode: "boolean" }).default(false),
  hasOwnMotorcycle: integer("has_own_motorcycle", { mode: "boolean" }).default(false),
  motorcycleLicenseNo: text("motorcycle_license_no"),
  officeMachineSkills: text("office_machine_skills"),
  hobbies: text("hobbies"),
  canWorkUpCountry: integer("can_work_up_country", { mode: "boolean" }).default(false),
  canWorkUpCountryOther: text("can_work_up_country_other"),

  // Additional info
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactRelation: text("emergency_contact_relation"),
  emergencyContactAddress: text("emergency_contact_address"),
  emergencyContactPhone: text("emergency_contact_phone"),
  jobInfoSource: text("job_info_source"),
  infoSource: text("info_source", { enum: ["internet", "announcement", "friend", "other"] }),
  infoSourceInternetDetail: text("info_source_internet_detail"),
  infoSourceDetail: text("info_source_detail"),
  seriousIllness: integer("serious_illness", { mode: "boolean" }).default(false),
  illnessDetail: text("illness_detail"),
  appliedBefore: integer("applied_before", { mode: "boolean" }).default(false),
  appliedBeforeWhen: text("applied_before_when"),
  relativesInCompany: text("relatives_in_company"),
  selfIntroduction: text("self_introduction"),

  orgChartDescription: text("org_chart_description"),
  jobResponsibilities: text("job_responsibilities"),

  signatureDataUrl: text("signature_data_url"),
  signedDate: text("signed_date"),
});

export const siblings = sqliteTable("siblings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: integer("age"),
  occupation: text("occupation"),
});

export const education = sqliteTable("education", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  level: text("level", {
    enum: ["high_school", "vocational", "diploma", "bachelor", "master", "other"],
  }).notNull(),
  institution: text("institution"),
  major: text("major"),
  yearFrom: text("year_from"),
  yearTo: text("year_to"),
  gpa: real("gpa"),
});

export const trainings = sqliteTable("trainings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  course: text("course"),
  dateFrom: text("date_from"),
  dateTo: text("date_to"),
  hasCertificate: integer("has_certificate", { mode: "boolean" }).default(false),
});

export const workExperience = sqliteTable("work_experience", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  dateFrom: text("date_from"),
  dateTo: text("date_to"),
  position: text("position"),
  jobDescription: text("job_description"),
  salary: real("salary"),
  reasonForLeaving: text("reason_for_leaving"),
});

const skillLevel = { enum: ["good", "fair", "poor"] } as const;

export const languageSkills = sqliteTable("language_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  language: text("language").notNull(), // thai | english | other
  languageOther: text("language_other"),
  listening: text("listening", skillLevel),
  reading: text("reading", skillLevel),
  writing: text("writing", skillLevel),
});

export const applicantReferences = sqliteTable("applicant_references", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  occupation: text("occupation"),
});
