import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { ApplicationFormValues } from "@/lib/application-schema";
import { Check, CheckRow, Field, Section, YesNoRow, pad, styles } from "./primitives";
import { OrgChartPdf, type OrgChartPayload } from "./OrgChartPdf";

// Content width = A4 (595.28pt) − 2×30pt horizontal padding.
const CONTENT_WIDTH = 535;

const educationLevelLabel: Record<string, { th: string; en: string }> = {
  high_school: { th: "มัธยมศึกษาตอนปลาย", en: "High school" },
  vocational: { th: "ปวช.", en: "Vocational" },
  diploma: { th: "ปวส.", en: "Diploma" },
  bachelor: { th: "ปริญญาตรี", en: "Bachelor's Degree" },
  master: { th: "ปริญญาตรีโท", en: "Master's Degree" },
  other: { th: "อื่นๆ", en: "Others" },
};

const languageLabel: Record<string, string> = {
  thai: "ภาษาไทย (Thai)",
  english: "ภาษาอังกฤษ (English)",
  other: "อื่นๆ (Other)",
};

// pad() appends the trailing-NBSP guard that stops react-pdf clipping the last
// Thai glyph (see primitives.tsx); every rendered string flows through it.
function txt(v: string | number | null | undefined): string {
  return pad(v);
}

function money(v: number | string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (s === "") return "";
  const n = Number(s.replace(/,/g, ""));
  return pad(Number.isNaN(n) ? s : n.toLocaleString("en-US"));
}

// Full letterhead — flows as ordinary content, so it appears on page 1 only.
function Header({ photoDataUrl }: { photoDataUrl?: string }) {
  return (
    <View style={styles.headerRow}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src="/form-assets/logo.png" style={styles.logo} />
      <View style={styles.headerCenter}>
        <Text style={styles.companyName}>{pad("2K LOGISTICS CO., LTD.")}</Text>
        <Text style={styles.companyAddress}>{pad("112/117 ม.18 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120")}</Text>
        <Text style={styles.formTitleTh}>{pad("ใบสมัครงาน")}</Text>
        <Text style={styles.formTitleEn}>{pad("APPLICATION FOR EMPLOYMENT")}</Text>
      </View>
      {photoDataUrl ? (
        // The upload pipeline emits exactly the box's 5:7 aspect (300×420), so
        // this fills the frame without objectFit and cannot distort a face.
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={photoDataUrl} style={styles.photoBox} />
      ) : (
        <View style={styles.photoBox}>
          <Text style={styles.photoBoxText}>{pad("ติดรูปถ่าย\n1 นิ้ว")}</Text>
        </View>
      )}
    </View>
  );
}

// Company logo pinned to the top-left corner of every page after the first
// (page 1 already carries the full letterhead above). Same width/height as
// styles.logo (the page-1 letterhead logo) so it renders at an identical size
// on every page, not just proportionally similar.
function CornerLogo() {
  return (
    <View
      fixed
      style={{ position: "absolute", top: 12, left: 30 }}
      render={({ pageNumber }) =>
        pageNumber > 1 ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src="/form-assets/logo.png" style={styles.logo} />
        ) : null
      }
    />
  );
}

/** `fixed` re-renders the header on every page its table spans, so a table
 *  that breaks mid-way still starts the next page with column labels instead
 *  of bare rows. It repeats only across the parent table's own pages. */
function TableHeader({ cols }: { cols: { label: string; flex: number }[] }) {
  return (
    <View style={styles.tr} wrap={false} fixed>
      {cols.map((c, i) => (
        <Text key={i} style={[styles.th, { flex: c.flex }, i === cols.length - 1 ? styles.thLast : {}]}>
          {pad(c.label)}
        </Text>
      ))}
    </View>
  );
}

export function ApplicationPdf({
  data,
  orgChart,
  orgChartImage,
}: {
  data: ApplicationFormValues;
  orgChart?: OrgChartPayload | null;
  /** An applicant-uploaded chart image (with aspect = height/width). Takes
   *  precedence over the drawn vector chart when present. */
  orgChartImage?: { dataUrl: string; aspect: number } | null;
}) {
  const education = data.education ?? [];
  const trainings = data.trainings ?? [];
  const workExperience = data.workExperience ?? [];
  const languageSkills = data.languageSkills ?? [];
  const references = data.references ?? [];
  const hasOrgChartImage = !!orgChartImage && !!orgChartImage.dataUrl;
  const hasOrgChart = !hasOrgChartImage && !!orgChart && orgChart.nodes.length > 0;

  // Fit the uploaded image full content width, but preserve its aspect and cap
  // the height so the chart plus the job-responsibilities + certification blocks
  // below it still fit on one page (react-pdf moves the wrap={false} block to a
  // fresh page if it doesn't; capping keeps that page from overflowing).
  const ORG_IMAGE_MAX_H = 450;
  let orgImgW = CONTENT_WIDTH;
  let orgImgH = orgChartImage ? CONTENT_WIDTH * orgChartImage.aspect : 0;
  if (orgImgH > ORG_IMAGE_MAX_H) {
    orgImgH = ORG_IMAGE_MAX_H;
    orgImgW = orgChartImage ? ORG_IMAGE_MAX_H / orgChartImage.aspect : CONTENT_WIDTH;
  }

  return (
    <Document title="ใบสมัครงาน - 2K Logistics" author="2K Logistics Co., Ltd.">
      <Page size="A4" style={styles.page} wrap>
        <CornerLogo />
        <Header photoDataUrl={data.photoDataUrl} />

        {/* Name / position / availability */}
        <View style={styles.row}>
          <Field label="ชื่อ" value={data.firstName} width="34%" />
          <Field label="นามสกุล" value={data.lastName} width="34%" />
          <Field label="ชื่อเล่น" value={data.nickname} width="26%" />
        </View>
        <View style={styles.row}>
          <Field label="ตำแหน่งที่ต้องการ 1" value={data.positionApplied1} />
          <Field label="2" value={data.positionApplied2} />
        </View>
        <View style={styles.row}>
          <Field label="เริ่มงานได้เมื่อ" value={data.availableStartDate} width="48%" />
          <Field label="เงินเดือนที่ต้องการ" value={money(data.expectedSalary)} suffix="บาท / เดือน" width="48%" />
        </View>

        {/* Personal information */}
        <Section en="Personal Information" th="ประวัติส่วนตัว" />
        <View style={styles.row}>
          <Field label="ที่อยู่ปัจจุบันเลขที่" value={data.addressNo} width="34%" />
          <Field label="หมู่ที่" value={data.moo} width="20%" />
          <Field label="ถนน" value={data.road} width="40%" />
        </View>
        <View style={styles.row}>
          <Field label="ตำบล/แขวง" value={data.subDistrict} width="25%" />
          <Field label="อำเภอ/เขต" value={data.district} width="25%" />
          <Field label="จังหวัด" value={data.province} width="25%" />
          <Field label="รหัสไปรษณีย์" value={data.postalCode} width="21%" />
        </View>
        <View style={styles.row}>
          <Field label="โทรศัพท์" value={data.phone} width="30%" />
          <Field label="มือถือ" value={data.mobile} width="34%" />
          <Field label="ไลน์ไอดี" value={data.lineId} width="30%" />
        </View>
        <View style={styles.row}>
          <Field label="อีเมล์" value={data.email} width="48%" />
          <Field label="IG / Facebook" value={data.socialMedia} width="48%" />
        </View>
        <CheckRow label="ที่พักอาศัย" en="Living with">
          <Check label="อาศัยกับครอบครัว" checked={data.livingWith === "parent"} />
          <Check label="บ้านตัวเอง" checked={data.livingWith === "own_home"} />
          <Check label="บ้านเช่า" checked={data.livingWith === "rented_house"} />
          <Check label="หอพัก" checked={data.livingWith === "dorm"} />
        </CheckRow>
        <View style={styles.row}>
          <Field label="วันเกิด" value={data.dateOfBirth} width="24%" />
          <Field label="อายุ" value={txt(data.age)} suffix="ปี" width="15%" />
          <Field label="ปีนักษัตร" value={data.chineseZodiac} width="18%" />
          <Field label="เชื้อชาติ" value={data.race} width="18%" />
          <Field label="สัญชาติ" value={data.nationality} width="18%" />
        </View>
        <View style={styles.row}>
          <Field label="ศาสนา" value={data.religion} width="20%" />
          <Field label="บัตรประชาชนเลขที่" value={data.idCardNumber} width="34%" />
          <Field label="บัตรหมดอายุ" value={data.idCardExpiry} width="20%" />
          <Field label="ส่วนสูง" value={txt(data.heightCm)} suffix="ซม." width="12%" />
          <Field label="น้ำหนัก" value={txt(data.weightKg)} suffix="กก." width="12%" />
        </View>
        <CheckRow label="ภาวะทางทหาร" en="Military status">
          <Check label="ได้รับการยกเว้น" checked={data.militaryStatus === "exempted"} />
          <Check label="ปลดเป็นทหารกองหนุน" checked={data.militaryStatus === "served"} />
          <Check label="ยังไม่ได้รับการเกณฑ์" checked={data.militaryStatus === "not_yet_served"} />
        </CheckRow>
        <View style={styles.checkRow} wrap={false}>
          <Text style={styles.checkLabel}>{pad("สถานภาพ")}</Text>
          <Check label="โสด" checked={data.maritalStatus === "single"} />
          <Check label="สมรส" checked={data.maritalStatus === "married"} />
          <Check label="หม้าย" checked={data.maritalStatus === "widowed"} />
          <Check label="แยกกัน" checked={data.maritalStatus === "separated"} />
          <Text style={[styles.checkLabel, { marginLeft: 14 }]}>{pad("เพศ")}</Text>
          <Check label="ชาย" checked={data.sex === "male"} />
          <Check label="หญิง" checked={data.sex === "female"} />
        </View>
        <View style={styles.row}>
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
            <Text style={styles.checkLabel}>{pad("เคยปฏิบัติธรรมะ")}</Text>
            <Check label="ไม่เคย" checked={data.everPracticedDharma === false} />
            <Check label="เคย" checked={data.everPracticedDharma === true} />
          </View>
          <Field label="สถานที่" value={data.dharmaPlace} width="30%" />
          <Field label="ระยะเวลา" value={data.dharmaDuration} width="24%" />
        </View>
        <CheckRow label="เอกสารประกอบการสมัคร">
          <Check label="บัตรประชาชน" checked={!!data.docIdCard} />
          <Check label="ทะเบียนบ้าน" checked={!!data.docHouseRegistration} />
          <Check label="Passport" checked={!!data.docPassport} />
          <Check label="วุฒิการศึกษา" checked={!!data.docEducationCert} />
          <Check label="ใบผ่านงาน" checked={!!data.docWorkCert} />
        </CheckRow>
        <View style={styles.row}>
          <Field label="เอกสารอื่นๆ ระบุ" value={data.docOther} />
        </View>

        {/* Family */}
        <Section en="Family Information" th="ประวัติครอบครัว" />
        <View style={styles.row}>
          <Field label="บิดา ชื่อ-สกุล" value={data.fatherName} width="50%" />
          <Field label="อายุ" value={txt(data.fatherAge)} suffix="ปี" width="16%" />
          <Field label="อาชีพ" value={data.fatherOccupation} width="30%" />
        </View>
        <View style={styles.row}>
          <Field label="มารดา ชื่อ-สกุล" value={data.motherName} width="50%" />
          <Field label="อายุ" value={txt(data.motherAge)} suffix="ปี" width="16%" />
          <Field label="อาชีพ" value={data.motherOccupation} width="30%" />
        </View>
        <View style={styles.row}>
          <Field label="ชื่อภรรยา/สามี" value={data.spouseName} width="40%" />
          <Field label="สถานที่ทำงาน" value={data.spouseWorkplace} width="32%" />
          <Field label="ตำแหน่ง" value={data.spousePosition} width="24%" />
        </View>
        <View style={styles.row}>
          <Field label="มีบุตร" value={txt(data.numberOfChildren)} suffix="คน" width="18%" />
          <Field label="มีพี่น้อง (รวมผู้สมัคร)" value={txt(data.numberOfSiblings)} suffix="คน" width="28%" />
          <Field label="ชาย" value={txt(data.numberOfBrothers)} suffix="คน" width="15%" />
          <Field label="หญิง" value={txt(data.numberOfSisters)} suffix="คน" width="15%" />
          <Field label="เป็นบุตรคนที่" value={txt(data.childOrder)} width="18%" />
        </View>
        {/* Education */}
        <View wrap={false}>
        <Section en="Education" th="การศึกษา" />
        <View style={styles.table}>
          <TableHeader
            cols={[
              { label: "ระดับการศึกษา\nEducational Level", flex: 2 },
              { label: "สถาบันการศึกษา\nInstitution", flex: 2.6 },
              { label: "สาขาวิชา\nMajor", flex: 2 },
              { label: "ตั้งแต่\nFrom", flex: 1.1 },
              { label: "ถึง\nTo", flex: 1.1 },
              { label: "GPA", flex: 0.9 },
            ]}
          />
          {education.map((r, i) => (
            <View key={i} style={[styles.tr, i < education.length - 1 ? styles.trBottom : {}]} wrap={false}>
              <View style={[styles.td, { flex: 2 }]}>
                <Text style={{ fontSize: 8 }}>{pad(educationLevelLabel[r.level]?.th ?? r.level)}</Text>
                <Text style={{ fontSize: 6.5, fontStyle: "italic", color: "#a3a3a3" }}>{pad(educationLevelLabel[r.level]?.en)}</Text>
              </View>
              <Text style={[styles.td, { flex: 2.6 }]}>{txt(r.institution)}</Text>
              <Text style={[styles.td, { flex: 2 }]}>{txt(r.major)}</Text>
              <Text style={[styles.td, { flex: 1.1, textAlign: "center" }]}>{txt(r.yearFrom)}</Text>
              <Text style={[styles.td, { flex: 1.1, textAlign: "center" }]}>{txt(r.yearTo)}</Text>
              <Text style={[styles.td, styles.tdLast, { flex: 0.9, textAlign: "center" }]}>{txt(r.gpa)}</Text>
            </View>
          ))}
        </View>
        </View>

        {/* Training */}
        <View wrap={false}>
        <Section en="Training / Internship Course / Activities" th="ประวัติการฝึกงาน / ฝึกอบรม / กิจกรรมพิเศษ" />
        <View style={styles.table}>
          <TableHeader
            cols={[
              { label: "สถาบัน\nInstitution", flex: 2 },
              { label: "หลักสูตร / ตำแหน่ง\nCourse / Position", flex: 2.4 },
              { label: "เริ่ม\nFrom", flex: 1.2 },
              { label: "สำเร็จ\nTo", flex: 1.2 },
              { label: "ใบรับรอง\nCertificate", flex: 1.2 },
            ]}
          />
          {trainings.map((r, i) => (
            <View key={i} style={[styles.tr, i < trainings.length - 1 ? styles.trBottom : {}]} wrap={false}>
              <Text style={[styles.td, { flex: 2 }]}>{txt(r.institution)}</Text>
              <Text style={[styles.td, { flex: 2.4 }]}>{txt(r.course)}</Text>
              <Text style={[styles.td, { flex: 1.2, textAlign: "center" }]}>{txt(r.dateFrom)}</Text>
              <Text style={[styles.td, { flex: 1.2, textAlign: "center" }]}>{txt(r.dateTo)}</Text>
              <Text style={[styles.td, styles.tdLast, { flex: 1.2, textAlign: "center" }]}>
                {pad(r.hasCertificate === true ? "มี" : r.hasCertificate === false ? "ไม่มี" : "")}
              </Text>
            </View>
          ))}
        </View>
        </View>

        {/* Work experience */}
        <View wrap={false}>
        <Section en="Work Experience" th="ประสบการณ์ทำงาน (เรียงจากที่ทำงานล่าสุด)" />
        <View style={styles.table}>
          <TableHeader
            cols={[
              { label: "สถานที่ทำงาน\nCompany", flex: 2 },
              { label: "เริ่ม\nFrom", flex: 1.1 },
              { label: "ถึง\nTo", flex: 1.1 },
              { label: "ตำแหน่ง\nPosition", flex: 1.5 },
              { label: "ลักษณะงาน\nJob description", flex: 2 },
              { label: "ค่าจ้าง\nSalary", flex: 1.1 },
              { label: "เหตุผลที่ลาออก\nReason", flex: 1.6 },
            ]}
          />
          {workExperience.map((r, i) => (
            <View key={i} style={[styles.tr, i < workExperience.length - 1 ? styles.trBottom : {}]} wrap={false}>
              <Text style={[styles.td, { flex: 2 }]}>{txt(r.company)}</Text>
              <Text style={[styles.td, { flex: 1.1, textAlign: "center", fontSize: 7.5 }]}>{txt(r.dateFrom)}</Text>
              <Text style={[styles.td, { flex: 1.1, textAlign: "center", fontSize: 7.5 }]}>{txt(r.dateTo)}</Text>
              <Text style={[styles.td, { flex: 1.5 }]}>{txt(r.position)}</Text>
              <Text style={[styles.td, { flex: 2, fontSize: 8 }]}>{txt(r.jobDescription)}</Text>
              <Text style={[styles.td, { flex: 1.1, textAlign: "center" }]}>{money(r.salary)}</Text>
              <Text style={[styles.td, styles.tdLast, { flex: 1.6, fontSize: 8 }]}>{txt(r.reasonForLeaving)}</Text>
            </View>
          ))}
        </View>
        </View>

        {/* Language ability — Good/Fair/Poor grid mirroring the web form */}
        <View wrap={false}>
        <Section en="Language Ability" th="ภาษา" />
        <View style={styles.table}>
          {/* Uses the SAME 9 flat flex:1 leaf cells as the sub-header/data rows
              below (not 3 merged flex:3 cells) — react-pdf sizes cells in
              content-box mode, so a row with fewer cells (less total
              padding+border overhead) computes a different per-flex-unit
              pixel size than a row with more cells, and the column
              boundaries silently drift out of alignment between rows. Making
              every row structurally identical guarantees identical column
              boundaries. The two internal dividers within each group are
              painted WHITE (#ffffff) — react-pdf ignores the "transparent"
              keyword (it leaves them dark), but a white 0.6px border is the
              same WIDTH as the dark ones below, so it vanishes on the white
              background while keeping the box-model math — and thus the
              boundary position — identical to the row below. Each group label is
              anchored INSIDE the MIDDLE cell of its 3-cell group (s===1),
              absolutely positioned with symmetric negative left/right insets
              and textAlign center. The middle cell is horizontally centered
              within its group BY SYMMETRY (regardless of the content-box
              padding drift that misaligns pure-percentage positioning), so
              the label always centers exactly over its 3-column span. */}
          <View style={[styles.tr, styles.trBottom]} wrap={false}>
            <Text style={[styles.th, { flex: 2.8 }]}>{pad("ภาษา\nLanguage")}</Text>
            {["ฟัง-พูด (Listening-Speaking)", "อ่าน (Reading)", "เขียน (Writing)"].flatMap((label, g) =>
              [0, 1, 2].map((s) => {
                const isLastOverall = g === 2 && s === 2;
                const isGroupEnd = s === 2;
                const isMiddle = s === 1;
                return (
                  <View
                    key={`${g}-${s}`}
                    style={[
                      styles.th,
                      { flex: 1 },
                      isMiddle ? { position: "relative" } : {},
                      !isGroupEnd ? { borderRightColor: "#ffffff" } : {},
                      isLastOverall ? styles.thLast : {},
                    ]}
                  >
                    {isMiddle ? (
                      <Text
                        style={{
                          position: "absolute",
                          top: 3,
                          left: "-140%",
                          right: "-140%",
                          textAlign: "center",
                          fontSize: 7,
                          fontWeight: "bold",
                        }}
                      >
                        {pad(label)}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
          <View style={[styles.tr, styles.trBottom]} wrap={false}>
            <Text style={[styles.th, { flex: 2.8 }]}> </Text>
            {["ดี", "ปานกลาง", "พอใช้", "ดี", "ปานกลาง", "พอใช้", "ดี", "ปานกลาง", "พอใช้"].map((lvl, i) => (
              <Text key={i} style={[styles.th, { flex: 1 }, i === 8 ? styles.thLast : {}]}>{pad(lvl)}</Text>
            ))}
          </View>
          {languageSkills.map((r, i) => {
            const cellCheck = (skill: "listening" | "reading" | "writing", level: string, last = false) => (
              <View style={[styles.td, { flex: 1, alignItems: "center" }, last ? styles.tdLast : {}]}>
                <Text style={{ fontSize: 9 }}>{r[skill] === level ? "✓" : ""}</Text>
              </View>
            );
            return (
              <View key={i} style={[styles.tr, i < languageSkills.length - 1 ? styles.trBottom : {}]} wrap={false}>
                <Text style={[styles.td, { flex: 2.8 }]}>
                  {pad(r.language === "other" ? r.languageOther || "อื่นๆ" : languageLabel[r.language])}
                </Text>
                {cellCheck("listening", "good")}
                {cellCheck("listening", "fair")}
                {cellCheck("listening", "poor")}
                {cellCheck("reading", "good")}
                {cellCheck("reading", "fair")}
                {cellCheck("reading", "poor")}
                {cellCheck("writing", "good")}
                {cellCheck("writing", "fair")}
                {cellCheck("writing", "poor", true)}
              </View>
            );
          })}
        </View>
        </View>

        {/* Special ability */}
        <Section en="Special Ability" th="ความสามารถพิเศษ" />
        <View style={styles.checkRow} wrap={false}>
          <Text style={styles.checkLabel}>{pad("ทักษะการพิมพ์ :")}</Text>
          <Field label="ไทย" value={txt(data.typingSpeedThai)} suffix="คำ/นาที" width={110} />
          <Field label="อังกฤษ" value={txt(data.typingSpeedEnglish)} suffix="คำ/นาที" width={120} />
          <Text style={[styles.checkLabel, { marginLeft: 6 }]}>{pad("พิมพ์สัมผัส")}</Text>
          <Check label="ไม่ได้" checked={data.touchTyping === false} />
          <Check label="ได้" checked={data.touchTyping === true} />
        </View>
        <YesNoRow label="คอมพิวเตอร์ :" value={data.computerSkills}>
          <Field label="ระบุ" value={data.computerSkillsDetail} width="55%" />
        </YesNoRow>
        <View style={styles.checkRow} wrap={false}>
          <Text style={styles.checkLabel}>{pad("ขับรถยนต์ :")}</Text>
          <Check label="ไม่ได้" checked={data.carDriver === false} />
          <Check label="ได้" checked={data.carDriver === true} />
          <Text style={[styles.checkLabel, { marginLeft: 10 }]}>{pad("มีพาหนะ")}</Text>
          <Check label="ไม่มี" checked={data.hasOwnCar === false} />
          <Check label="มี" checked={data.hasOwnCar === true} />
          <Field label="ใบขับขี่เลขที่" value={data.carLicenseNo} width="34%" />
        </View>
        <View style={styles.checkRow} wrap={false}>
          <Text style={styles.checkLabel}>{pad("ขับรถจักรยานยนต์ :")}</Text>
          <Check label="ไม่ได้" checked={data.motorcycleDriver === false} />
          <Check label="ได้" checked={data.motorcycleDriver === true} />
          <Text style={[styles.checkLabel, { marginLeft: 10 }]}>{pad("มีพาหนะ")}</Text>
          <Check label="ไม่มี" checked={data.hasOwnMotorcycle === false} />
          <Check label="มี" checked={data.hasOwnMotorcycle === true} />
          <Field label="ใบขับขี่เลขที่" value={data.motorcycleLicenseNo} width="30%" />
        </View>
        <View style={styles.row}>
          <Field label="ความสามารถในการใช้เครื่องใช้สำนักงาน" value={data.officeMachineSkills} en="Office Machine" />
        </View>
        <View style={styles.row}>
          <Field label="งานอดิเรก / กีฬาที่ชอบ / ความรู้พิเศษ" value={data.hobbies} />
        </View>
        <YesNoRow label="สามารถไปปฏิบัติงานต่างจังหวัด" value={data.canWorkUpCountry}>
          <Field label="อื่นๆ ระบุ" value={data.canWorkUpCountryOther} width="45%" />
        </YesNoRow>

        {/* Emergency & additional */}
        <View style={styles.row}>
          <Field label="กรณีฉุกเฉินติดต่อ ชื่อ-นามสกุล" value={data.emergencyContactName} width="42%" />
          <Field label="เกี่ยวข้องเป็น" value={data.emergencyContactRelation} width="24%" />
          <Field label="โทร." value={data.emergencyContactPhone} width="28%" />
        </View>
        <View style={styles.row}>
          <Field label="ที่อยู่ผู้ติดต่อฉุกเฉิน" value={data.emergencyContactAddress} />
        </View>
        <View style={styles.row}>
          <Field label="ทราบข่าวการรับสมัครจาก" value={data.jobInfoSource} en="Sources of job information" />
        </View>
        <YesNoRow label="เคยป่วยหนัก/โรคติดต่อร้ายแรง" value={data.seriousIllness} yes="เคย" no="ไม่เคย">
          <Field label="ถ้าเคยระบุชื่อโรค" value={data.illnessDetail} width="45%" />
        </YesNoRow>
        <YesNoRow label="เคยสมัครงานกับบริษัทฯ นี้" value={data.appliedBefore} yes="เคย" no="ไม่เคย">
          <Field label="ถ้าเคย เมื่อไร" value={data.appliedBeforeWhen} width="45%" />
        </YesNoRow>
        <CheckRow label="ทราบข่าวการรับสมัครจากช่องทางใหน?">
          <Check label="อินเตอร์เน็ต" checked={data.infoSource === "internet"} />
          <Check label="ประกาศ" checked={data.infoSource === "announcement"} />
          <Check label="เพื่อน" checked={data.infoSource === "friend"} />
          <Check label="อื่นๆ" checked={data.infoSource === "other"} />
        </CheckRow>
        <View style={styles.row}>
          <Field label="เว็บไซต์ (อินเทอร์เน็ต)" value={data.infoSourceInternetDetail} width="50%" />
          <Field label="ช่องทางอื่นๆ ระบุ" value={data.infoSourceDetail} width="50%" />
        </View>
        <View style={styles.row}>
          <Field label="ญาติ/เพื่อนที่ทำงานในบริษัทฯ" value={data.relativesInCompany} />
        </View>

        {/* References — `break` starts a fresh page for this block. On a
            lightly filled form it would otherwise land at the tail of the
            preceding page and crowd it; on a heavily filled one it already
            falls on its own page, so the rule costs nothing there. Owner's
            call: a roomier page is preferred over squeezing this block in. */}
        <View break wrap={false}>
        <Text style={styles.paragraphLabel}>{pad("บุคคลอ้างอิง 2 คน (ไม่ใช่ญาติหรือนายจ้างเดิม)")}</Text>
        <View style={styles.table}>
          <TableHeader
            cols={[
              { label: "ชื่อ / Name", flex: 1.6 },
              { label: "ที่อยู่ / Address", flex: 2.2 },
              { label: "โทรศัพท์ / Tel.", flex: 1.3 },
              { label: "อาชีพ / Occupation", flex: 1.4 },
            ]}
          />
          {references.map((r, i) => (
            <View key={i} style={[styles.tr, i < references.length - 1 ? styles.trBottom : {}]} wrap={false}>
              <Text style={[styles.td, { flex: 1.6 }]}>{txt(r.name)}</Text>
              <Text style={[styles.td, { flex: 2.2 }]}>{txt(r.address)}</Text>
              <Text style={[styles.td, { flex: 1.3 }]}>{txt(r.phone)}</Text>
              <Text style={[styles.td, styles.tdLast, { flex: 1.4 }]}>{txt(r.occupation)}</Text>
            </View>
          ))}
        </View>
        </View>

        {/* Self introduction */}
        <View wrap={false}>
          <Text style={styles.paragraphLabel}>{pad("แนะนำตัวท่านเอง")}</Text>
          <Text style={styles.paragraphBox}>{pad(data.selfIntroduction)}</Text>
        </View>

        {/* Org chart (vector) — flows into whatever room is left on the
            current page rather than forcing a fresh one, which used to leave
            the preceding page ~3/4 empty. `wrap={false}` still keeps the
            chart whole: react-pdf moves it to the next page by itself when it
            no longer fits, so it is never split down the middle. */}
        <View style={{ marginTop: 6 }} wrap={false}>
          <Text style={styles.paragraphLabel}>{pad("ผังโครงสร้างองค์กรหรือแผนก (ที่ทำงานล่าสุด)")}</Text>
          {hasOrgChartImage ? (
            <View style={{ marginTop: 3, alignItems: "center" }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={orgChartImage!.dataUrl} style={{ width: orgImgW, height: orgImgH }} />
            </View>
          ) : hasOrgChart ? (
            <View style={{ marginTop: 3 }}>
              <OrgChartPdf payload={orgChart!} width={CONTENT_WIDTH} />
            </View>
          ) : (
            <View style={{ marginTop: 3, height: 150, borderWidth: 0.6, borderStyle: "dotted", borderColor: "#a3a3a3" }} />
          )}
        </View>

        {/* Job responsibilities */}
        <View wrap={false}>
          <Text style={styles.paragraphLabel}>{pad("หน้าที่รับผิดชอบโดยละเอียด (ที่ทำงานล่าสุด)")}</Text>
          <Text style={styles.paragraphBox}>{pad(data.jobResponsibilities)}</Text>
        </View>

        {/* Certification */}
        <View style={{ marginTop: 8, borderTopWidth: 0.6, borderColor: "#a3a3a3", paddingTop: 6 }} wrap={false}>
          <Text style={styles.certifyTh}>
            ข้าพเจ้าขอรับรองว่า ข้อความดังกล่าวทั้งหมดในใบสมัครนี้เป็นความจริงทุกประการ หลังจากบริษัทจ้างเข้ามาทำงานแล้วปรากฏว่า
            ข้อความในใบสมัครงาน เอกสารที่นำมาแสดง หรือรายละเอียดที่ให้ไว้ไม่เป็นความจริง บริษัทฯ
            มีสิทธิ์ที่จะเลิกจ้างข้าพเจ้าได้โดยไม่ต้องจ่ายเงินชดเชยหรือค่าเสียหายใดๆ ทั้งสิ้น{" "}
          </Text>
          <Text style={styles.certifyEn}>
            I certify all statement given in this application form is true. The Company has the right to terminate my employment
            without any compensation if any is found to be untrue after engagement.{" "}
          </Text>
          <View style={[styles.checkRow, { marginTop: 4 }]}>
            <Check label="ข้าพเจ้ารับทราบและยอมรับเงื่อนไขข้างต้น" checked={!!data.consentTruthful} />
          </View>
        </View>

        {/* Signature & date — right-aligned and STACKED vertically (ลงชื่อ on
            top, วันที่ below), matching the frontend's flex-col/w-260 block.
            Previously rendered side-by-side in a row, which didn't match. */}
        <View style={{ marginTop: 16, alignItems: "flex-end" }} wrap={false}>
          <View style={{ width: 240 }}>
            <View style={styles.row}>
              <Field label="ลงชื่อ" value={data.signatureDataUrl} suffix="ผู้สมัคร" />
            </View>
            <View style={styles.row}>
              <Field label="วันที่" value={data.signedDate} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
