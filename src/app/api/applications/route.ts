import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  applications,
  siblings,
  education,
  trainings,
  workExperience,
  languageSkills,
  applicantReferences,
} from "@/db/schema";
import { applicationFormSchema, isBlankRow } from "@/lib/application-schema";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = applicationFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_data", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    siblings: siblingRowsRaw,
    education: educationRows,
    trainings: trainingRowsRaw,
    workExperience: workExperienceRowsRaw,
    languageSkills: languageSkillRows,
    references: referenceRowsRaw,
    consentTruthful: _consentTruthful,
    ...applicationData
  } = parsed.data;

  // Untouched placeholder rows (siblings/trainings/work experience/references
  // the user never filled in) pass validation but shouldn't be persisted.
  const siblingRows = siblingRowsRaw.filter((row) => !isBlankRow(row));
  const trainingRows = trainingRowsRaw.filter((row) => !isBlankRow(row));
  const workExperienceRows = workExperienceRowsRaw.filter((row) => !isBlankRow(row));
  const referenceRows = referenceRowsRaw.filter((row) => !isBlankRow(row));

  const db = await getDb();

  const [created] = await db.insert(applications).values(applicationData).returning({ id: applications.id });
  const applicationId = created.id;

  // superRefine guarantees non-blank rows have their primary field set;
  // the `?? ""` here only satisfies TypeScript's static (optional) inference.
  if (siblingRows.length > 0) {
    await db
      .insert(siblings)
      .values(siblingRows.map((row) => ({ ...row, name: row.name ?? "", applicationId })));
  }
  if (educationRows.length > 0) {
    await db.insert(education).values(educationRows.map((row) => ({ ...row, applicationId })));
  }
  if (trainingRows.length > 0) {
    await db
      .insert(trainings)
      .values(trainingRows.map((row) => ({ ...row, institution: row.institution ?? "", applicationId })));
  }
  if (workExperienceRows.length > 0) {
    await db
      .insert(workExperience)
      .values(workExperienceRows.map((row) => ({ ...row, company: row.company ?? "", applicationId })));
  }
  if (languageSkillRows.length > 0) {
    await db.insert(languageSkills).values(languageSkillRows.map((row) => ({ ...row, applicationId })));
  }
  if (referenceRows.length > 0) {
    await db
      .insert(applicantReferences)
      .values(referenceRows.map((row) => ({ ...row, name: row.name ?? "", applicationId })));
  }

  return NextResponse.json({ id: applicationId }, { status: 201 });
}
