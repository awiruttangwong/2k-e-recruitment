import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
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

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 py-2 text-sm last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-base font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (Number.isNaN(id)) notFound();

  const db = await getDb();
  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app) notFound();

  const [siblingRows, educationRows, trainingRows, workRows, languageRows, referenceRows] = await Promise.all([
    db.select().from(siblings).where(eq(siblings.applicationId, id)),
    db.select().from(education).where(eq(education.applicationId, id)),
    db.select().from(trainings).where(eq(trainings.applicationId, id)),
    db.select().from(workExperience).where(eq(workExperience.applicationId, id)),
    db.select().from(languageSkills).where(eq(languageSkills.applicationId, id)),
    db.select().from(applicantReferences).where(eq(applicantReferences.applicationId, id)),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header>
        <p className="text-sm text-neutral-400">ใบสมัครงาน #{app.id}</p>
        <h1 className="text-2xl font-bold text-neutral-900">
          {app.firstName} {app.lastName} {app.nickname ? `(${app.nickname})` : ""}
        </h1>
        <p className="text-neutral-600">สมัครตำแหน่ง: {app.positionApplied1}</p>
      </header>

      <Card title="ข้อมูลติดต่อ">
        <Row label="มือถือ" value={app.mobile} />
        <Row label="โทรศัพท์" value={app.phone} />
        <Row label="อีเมล" value={app.email} />
        <Row label="LINE ID" value={app.lineId} />
        <Row label="ที่อยู่" value={[app.addressNo, app.moo, app.road, app.subDistrict, app.district, app.province, app.postalCode].filter(Boolean).join(" ")} />
      </Card>

      <Card title="ประวัติส่วนตัว">
        <Row label="วันเกิด" value={app.dateOfBirth} />
        <Row label="อายุ" value={app.age} />
        <Row label="เพศ" value={app.sex} />
        <Row label="สถานภาพ" value={app.maritalStatus} />
        <Row label="สัญชาติ / ศาสนา" value={[app.nationality, app.religion].filter(Boolean).join(" / ")} />
        <Row label="เลขบัตรประชาชน" value={app.idCardNumber} />
        <Row label="ภาวะทางทหาร" value={app.militaryStatus} />
      </Card>

      {educationRows.length > 0 ? (
        <Card title="การศึกษา">
          {educationRows.map((row) => (
            <Row key={row.id} label={row.level} value={[row.institution, row.major, row.gpa ? `GPA ${row.gpa}` : null].filter(Boolean).join(" / ")} />
          ))}
        </Card>
      ) : null}

      {workRows.length > 0 ? (
        <Card title="ประสบการณ์ทำงาน">
          {workRows.map((row) => (
            <Row
              key={row.id}
              label={`${row.company} (${row.dateFrom ?? "?"} - ${row.dateTo ?? "ปัจจุบัน"})`}
              value={row.position}
            />
          ))}
        </Card>
      ) : null}

      {languageRows.length > 0 ? (
        <Card title="ความสามารถทางภาษา">
          {languageRows.map((row) => (
            <Row
              key={row.id}
              label={row.language === "other" ? row.languageOther ?? "อื่นๆ" : row.language}
              value={`ฟัง-พูด ${row.listening ?? "-"} / อ่าน ${row.reading ?? "-"} / เขียน ${row.writing ?? "-"}`}
            />
          ))}
        </Card>
      ) : null}

      {siblingRows.length > 0 ? (
        <Card title="พี่น้อง">
          {siblingRows.map((row) => (
            <Row key={row.id} label={row.name} value={row.occupation} />
          ))}
        </Card>
      ) : null}

      {trainingRows.length > 0 ? (
        <Card title="ฝึกอบรม / กิจกรรม">
          {trainingRows.map((row) => (
            <Row key={row.id} label={row.institution} value={row.course} />
          ))}
        </Card>
      ) : null}

      {referenceRows.length > 0 ? (
        <Card title="บุคคลอ้างอิง">
          {referenceRows.map((row) => (
            <Row key={row.id} label={row.name} value={row.phone} />
          ))}
        </Card>
      ) : null}

      {app.selfIntroduction ? (
        <Card title="แนะนำตัวเอง">
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{app.selfIntroduction}</p>
        </Card>
      ) : null}
    </main>
  );
}
