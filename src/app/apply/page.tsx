"use client";

import { Fragment, useRef, useState } from "react";
import Image from "next/image";
import { useForm, useFieldArray, FormProvider, type DefaultValues, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationFormSchema, type ApplicationFormValues } from "@/lib/application-schema";
import { PaperField, PaperTextArea, PaperCheckbox, YesNo, SectionBar, ThaiDateField, formatThaiDate, formatThaiPhone, formatThaiIdCard, formatThaiSalary, isThaiDateInvalid } from "@/components/form/paper-fields";
import { OrgChartBuilder } from "@/components/form/org-chart-builder";
import { PhotoUploadBox } from "@/components/form/photo-upload";

// zod v4's optional/default combinations produce an output type that TS's
// structural checker can't cleanly reconcile with react-hook-form's Resolver
// generic across ~90 fields; the cast below is type-level only — the schema
// still fully validates at runtime.
const typedResolver = zodResolver(applicationFormSchema) as unknown as Resolver<ApplicationFormValues>;

const defaultValues: DefaultValues<ApplicationFormValues> = {

  education: [
    { level: "high_school" },
    { level: "vocational" },
    { level: "diploma" },
    { level: "bachelor" },
    { level: "master" },
    { level: "other" },
  ],
  trainings: [{ institution: "", hasCertificate: undefined as unknown as boolean }, { institution: "", hasCertificate: undefined as unknown as boolean }],
  workExperience: [{ company: "" }, { company: "" }, { company: "" }, { company: "" }],
  languageSkills: [{ language: "thai" }, { language: "english" }, { language: "other", languageOther: "" }],
  references: [{ name: "" }, { name: "" }],
  // These ten drive YesNo pairs, whose "no" checkbox renders checked when
  // currentValue === false — seeding false here would show it pre-checked
  // before the user has touched it, same class of bug as hasCertificate above.
  touchTyping: undefined as unknown as boolean,
  computerSkills: undefined as unknown as boolean,
  carDriver: undefined as unknown as boolean,
  hasOwnCar: undefined as unknown as boolean,
  motorcycleDriver: undefined as unknown as boolean,
  hasOwnMotorcycle: undefined as unknown as boolean,
  canWorkUpCountry: undefined as unknown as boolean,
  everPracticedDharma: undefined as unknown as boolean,
  seriousIllness: undefined as unknown as boolean,
  appliedBefore: undefined as unknown as boolean,
  docIdCard: false,
  docHouseRegistration: false,
  docPassport: false,
  docEducationCert: false,
  docWorkCert: false,
};

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

// Walks react-hook-form's nested error tree (objects for single fields,
// arrays for field arrays) and returns the dot-path of the first leaf error
// found, e.g. "siblings.2.name" — matching the `name` attribute react-hook-form
// puts on the actual <input>, so we can scroll straight to it.
function findFirstErrorPath(node: unknown, prefix = ""): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  if (typeof obj.message === "string" && typeof obj.type === "string") {
    return prefix || null;
  }
  const keys = Array.isArray(node) ? node.map((_, i) => String(i)) : Object.keys(obj);
  for (const key of keys) {
    const child = obj[key];
    if (!child) continue;
    const found = findFirstErrorPath(child, prefix ? `${prefix}.${key}` : key);
    if (found) return found;
  }
  return null;
}

const thCell = "border border-neutral-500 px-2 py-1 text-center text-[11px] font-semibold leading-tight";
const tdCell = "border border-neutral-500 p-0.5 align-middle";
const cellInput = "w-full border-0 bg-transparent px-1 py-1 text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-400";
const dateCellInput = "w-full border-0 bg-transparent px-0.5 py-1 text-center text-[11px] tracking-tight focus:outline-none focus:ring-1 focus:ring-blue-400";


/** Reusable date input for table cells (training & work experience).
 *  Applies formatThaiDate on change and turns the cell red when
 *  the typed day/month is out of range, matching ThaiDateField behaviour. */
function DateCellInput({ reg }: { reg: ReturnType<typeof import("react-hook-form").useForm>["register"] extends (...args: never[]) => infer R ? R : never }) {
  const [invalid, setInvalid] = useState(false);
  const { onChange, ...rest } = reg;
  return (
    <div>
      <input
        className={`${dateCellInput} ${invalid ? "text-red-600 ring-1 ring-red-400" : ""}`}
        inputMode="numeric"
        maxLength={10}
        placeholder="วว/ดด/ปปปป"
        {...rest}
        onChange={(e) => {
          e.target.value = formatThaiDate(e.target.value);
          setInvalid(isThaiDateInvalid(e.target.value));
          void onChange(e);
        }}
      />
      {invalid && <p className="text-[9px] text-red-600 leading-tight mt-0.5">วัน/เดือนไม่ถูกต้อง</p>}
    </div>
  );
}

function autoGrowTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

/** Single-line-looking cell that grows taller as the user types long text
 *  (company names, job descriptions), instead of overflowing or clipping
 *  the fixed-width table column. Column widths stay matched to the docx. */
function AutoGrowCellInput({ reg }: { reg: ReturnType<typeof import("react-hook-form").useForm>["register"] extends (...args: never[]) => infer R ? R : never }) {
  const { onChange, ref, ...rest } = reg;
  return (
    <textarea
      rows={1}
      className={`${cellInput} block resize-none overflow-hidden leading-snug`}
      ref={(el) => {
        ref(el);
        autoGrowTextarea(el);
      }}
      onChange={(e) => {
        autoGrowTextarea(e.target);
        void onChange(e);
      }}
      {...rest}
    />
  );
}

export default function ApplyPage() {

  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const formMethods = useForm<ApplicationFormValues>({
    resolver: typedResolver,
    defaultValues,
  });
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = formMethods;

  // Vector org-chart data lifted from the builder, used at PDF-generation time
  // so the chart is drawn as crisp SVG rather than a raster snapshot.
  const orgChartPayloadRef = useRef<import("@/lib/pdf/OrgChartPdf").OrgChartPayload | null>(null);
  // The applicant's uploaded chart image (with its aspect), which takes
  // precedence over the drawn vector chart when present.
  const orgChartImageRef = useRef<import("@/components/form/org-chart-builder").OrgChartImage | null>(null);

  const heightCmValue = watch("heightCm");
  const weightKgValue = String(watch("weightKg") ?? "");
  const trainingsWatch = watch("trainings") || [];
  const nicknameValue = watch("nickname") || "";
  const addressNoValue = watch("addressNo") || "";
  const mooValue = watch("moo") || "";
  const roadValue = watch("road") || "";
  const numberOfChildrenValue = String(watch("numberOfChildren") ?? "");
  const numberOfSiblingsValue = String(watch("numberOfSiblings") ?? "");
  const numberOfBrothersValue = String(watch("numberOfBrothers") ?? "");
  const numberOfSistersValue = String(watch("numberOfSisters") ?? "");
  const childOrderValue = String(watch("childOrder") ?? "");

  const educationArray = useFieldArray({ control, name: "education" });
  const trainingsArray = useFieldArray({ control, name: "trainings" });
  const workExperienceArray = useFieldArray({ control, name: "workExperience" });
  const languageSkillsArray = useFieldArray({ control, name: "languageSkills" });
  const referencesArray = useFieldArray({ control, name: "references" });

  const onSubmit = async (values: ApplicationFormValues) => {
    setSubmitState("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "submit_failed");
      }
      setSubmitState("success");
    } catch {
      setSubmitState("error");
      setServerError("ไม่สามารถส่งใบสมัครได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // No visible "*" markers on required fields — instead, an invalid submit
  // scrolls straight to the first incomplete field and focuses it.
  const onInvalid = (formErrors: FieldErrors<ApplicationFormValues>) => {
    const path = findFirstErrorPath(formErrors);
    if (!path) return;
    const el = document.querySelector<HTMLElement>(`[name="${path}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el.focus({ preventScroll: true }), 350);
  };

  // "Download PDF" generates a true data-driven vector PDF via
  // @react-pdf/renderer: real (selectable) text, the org chart drawn as crisp
  // SVG, automatic smart page breaks, and a small file — no screen capture.
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const handleDownloadPdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    setServerError(null);
    try {
      const [{ pdf }, { ApplicationPdf }, { ensurePdfFontsRegistered }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/ApplicationPdf"),
        import("@/lib/pdf/fonts"),
      ]);
      ensurePdfFontsRegistered();
      const values = getValues();
      const blob = await pdf(
        <ApplicationPdf
          data={values}
          orgChart={orgChartPayloadRef.current}
          orgChartImage={orgChartImageRef.current}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Once ชื่อ/นามสกุล/ตำแหน่งที่ต้องการ are all filled in, name the file
      // after the applicant instead of the generic default — makes multiple
      // downloaded applications easy to tell apart in a folder.
      const sanitize = (s: string) => s.trim().replace(/[\\/:*?"<>|]/g, "");
      const firstName = sanitize(values.firstName ?? "");
      const lastName = sanitize(values.lastName ?? "");
      const position = sanitize(values.positionApplied1 ?? "");
      a.download =
        firstName && lastName && position
          ? `${firstName}-${lastName}-${position}.pdf`
          : "ใบสมัครงาน-2K-Logistics.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setServerError("ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (submitState === "success") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">ส่งใบสมัครงานเรียบร้อยแล้ว</h1>
        <p className="mt-2 text-neutral-600">
          ขอบคุณที่สนใจร่วมงานกับ 2K Logistics Co., Ltd. ทีมงานจะติดต่อกลับหากคุณสมบัติตรงกับตำแหน่งที่เปิดรับ
        </p>
      </main>
    );
  }

  return (
    <main className="bg-neutral-200 py-8 print:bg-white print:py-0">
      <div id="application-sheet" className="sheet mx-auto bg-white text-neutral-900 shadow-lg print:shadow-none">
        {/* FormProvider wraps the letterhead too, not just the <form> — the
            photo box lives up here but writes photoDataUrl via form context. */}
        <FormProvider {...formMethods}>
        {/* ── Letterhead: logo left · company/title centered · photo box right ── */}
        <header className="flex items-start gap-4 pb-3">
          <Image
            src="/form-assets/logo.png"
            alt="2K Logistics"
            width={90}
            height={54}
            style={{ width: 76, height: "auto" }}
            className="mt-1 shrink-0"
            priority
          />
          <div className="flex-1 pt-1 text-center">
            <p className="text-[15px] font-bold leading-snug">2K LOGISTICS CO., LTD.</p>
            <p className="mt-1 text-[11px] text-neutral-700">112/117 ม.18 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120</p>
            <p className="mt-1.5 text-[18px] font-bold leading-snug">ใบสมัครงาน</p>
            <p className="text-[12px] italic tracking-wide text-neutral-700">APPLICATION FOR EMPLOYMENT</p>
          </div>
          {/* Photo attachment box — true 25mm × 35mm (standard Thai
              job-application "รูปถ่าย 1 นิ้ว" photo size) */}
          <PhotoUploadBox />
        </header>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-3 space-y-3">
          {/* Name / Nickname */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[2fr_2fr_1.3fr]">
            <PaperField th="ชื่อ" required error={errors.firstName?.message} {...register("firstName")} />
            <PaperField th="นามสกุล" required error={errors.lastName?.message} {...register("lastName")} />
            <PaperField
              th="ชื่อเล่น"
              style={{ textAlign: nicknameValue.length > 8 ? "left" : "center" }}
              {...register("nickname")}
            />
          </div>
          <p className="-mt-2 text-[10px] italic text-neutral-400">Name / Surname / Nickname</p>

          {/* Position applied for */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <PaperField th="ตำแหน่งที่ต้องการ 1" required error={errors.positionApplied1?.message} {...register("positionApplied1")} />
            <PaperField th="2" {...register("positionApplied2")} />
          </div>
          <p className="-mt-2 text-[10px] italic text-neutral-400">Position Applied for</p>

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <ThaiDateField th="คุณสามารถเริ่มงานได้เมื่อใด" en="When are you available to start a new job" inputCentered registration={register("availableStartDate")} />
            <PaperField
              th="เงินเดือน"
              type="text"
              inputMode="numeric"
              maxLength={6}
              format={formatThaiSalary}
              suffix="บาท / เดือน"
              en="Salary — Baht / Month"
              error={errors.expectedSalary?.message}
              style={{ textAlign: "center" }}
              {...register("expectedSalary")}
            />
          </div>

          {/* ── Personal Information ── */}
          <SectionBar en="Personal Information" th="ประวัติส่วนตัว" />

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
            <PaperField th="ที่อยู่ปัจจุบันเลขที่" style={{ textAlign: addressNoValue.length > 8 ? "left" : "center" }} {...register("addressNo")} />
            <PaperField th="หมู่ที่" style={{ textAlign: mooValue.length > 8 ? "left" : "center" }} {...register("moo")} />
            <PaperField th="ถนน" style={{ textAlign: roadValue.length > 8 ? "left" : "center" }} {...register("road")} />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-4">
            <PaperField th="ตำบล/แขวง" {...register("subDistrict")} />
            <PaperField th="อำเภอ/เขต" {...register("district")} />
            <PaperField th="จังหวัด" {...register("province")} />
            <PaperField th="รหัสไปรษณีย์" {...register("postalCode")} />
          </div>
          <p className="-mt-1 text-[10px] italic text-neutral-400">
            Present address / Moo / Road / Sub-District / District / Province / Post code
          </p>

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
            <PaperField th="โทรศัพท์" inputMode="tel" maxLength={12} format={formatThaiPhone} {...register("phone")} />
            <PaperField th="มือถือ" required error={errors.mobile?.message} inputMode="tel" maxLength={12} format={formatThaiPhone} {...register("mobile")} />
            <PaperField th="ไลน์ไอดี" {...register("lineId")} />
          </div>
          <p className="-mt-2 text-[10px] italic text-neutral-400">Tel. / Mobile / Line ID</p>

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <PaperField th="อีเมล์" type="email" required error={errors.email?.message} {...register("email")} />
            <PaperField th="อินสตาแกรม / เฟซบุ๊ก" en="Instagram / Facebook" {...register("socialMedia")} />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <PaperCheckbox th="อาศัยกับครอบครัว" value="parent" type="radio" {...register("livingWith")} />
            <PaperCheckbox th="บ้านตัวเอง" value="own_home" type="radio" {...register("livingWith")} />
            <PaperCheckbox th="บ้านเช่า" value="rented_house" type="radio" {...register("livingWith")} />
            <PaperCheckbox th="หอพัก" value="dorm" type="radio" {...register("livingWith")} />
            <span className="text-[10px] italic text-neutral-400">Living with parent / Own home / Hired house / Hostel</span>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-[13rem_6rem_7rem_7rem]">
            <ThaiDateField th="วัน เดือน ปีเกิด" required error={errors.dateOfBirth?.message} registration={register("dateOfBirth")} />
            <PaperField
              th="อายุ"
              type="number"
              suffix="ปี"
              min={10}
              max={60}
              onInput={(e) => {
                if (e.currentTarget.value.length > 2) {
                  e.currentTarget.value = e.currentTarget.value.slice(0, 2);
                }
              }}
              error={errors.age?.message}
              {...register("age")}
            />
            <PaperField th="ปีนักษัตร" {...register("chineseZodiac")} />
            <PaperField th="เชื้อชาติ" {...register("race")} />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-4">
            <PaperField th="สัญชาติ" {...register("nationality")} />
            <PaperField th="ศาสนา" {...register("religion")} />
            <PaperField
              th="ส่วนสูง"
              type="number"
              suffix="ซม."
              min={100}
              max={200}
              style={{ textAlign: String(heightCmValue ?? "").length > 5 ? "left" : "center" }}
              onInput={(e) => {
                if (e.currentTarget.value.length > 3) {
                  e.currentTarget.value = e.currentTarget.value.slice(0, 3);
                }
              }}
              error={errors.heightCm?.message || (heightCmValue && Number(heightCmValue) > 200 ? "ส่วนสูงต้องไม่เกิน 200 ซม." : undefined)}
              {...register("heightCm")}
            />
            <PaperField
              th="น้ำหนัก"
              type="number"
              suffix="กก."
              style={{ textAlign: weightKgValue.length > 5 ? "left" : "center" }}
              {...register("weightKg")}
            />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <PaperField th="บัตรประชาชนเลขที่" required error={errors.idCardNumber?.message} inputMode="numeric" maxLength={25} format={formatThaiIdCard} {...register("idCardNumber")} />
            <ThaiDateField th="บัตรหมดอายุ" inputCentered registration={register("idCardExpiry")} />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="text-[15px]">ภาวะทางทหาร</span>
            <PaperCheckbox th="ได้รับการยกเว้น" value="exempted" type="radio" {...register("militaryStatus")} />
            <PaperCheckbox th="ปลดเป็นทหารกองหนุน" value="served" type="radio" {...register("militaryStatus")} />
            <PaperCheckbox th="ยังไม่ได้รับการเกณฑ์" value="not_yet_served" type="radio" {...register("militaryStatus")} />
            <span className="text-[10px] italic text-neutral-400">Military status / Exempted / Served / Not yet served</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex flex-wrap items-center gap-x-4">
              <span className="text-[15px]">สถานภาพ</span>
              <PaperCheckbox th="โสด" value="single" type="radio" {...register("maritalStatus")} />
              <PaperCheckbox th="สมรส" value="married" type="radio" {...register("maritalStatus")} />
              <PaperCheckbox th="หม้าย" value="widowed" type="radio" {...register("maritalStatus")} />
              <PaperCheckbox th="แยกกัน" value="separated" type="radio" {...register("maritalStatus")} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4">
              <span className="text-[15px]">เพศ</span>
              <PaperCheckbox th="ชาย" value="male" type="radio" {...register("sex")} />
              <PaperCheckbox th="หญิง" value="female" type="radio" {...register("sex")} />
            </div>
          </div>

          <YesNo th="เคยผ่านการปฏิบัติธรรมะมาหรือไม่" name="everPracticedDharma" register={register} noLabel="ไม่เคย" yesLabel="เคย" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <PaperField th="สถานที่" {...register("dharmaPlace")} />
            <PaperField th="ระยะเวลา" {...register("dharmaDuration")} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[15px]">เอกสารประกอบการสมัคร</span>
            <PaperCheckbox th="บัตรประชาชน" {...register("docIdCard")} />
            <PaperCheckbox th="ทะเบียนบ้าน" {...register("docHouseRegistration")} />
            <PaperCheckbox th="Passport" {...register("docPassport")} />
            <PaperCheckbox th="วุฒิการศึกษา" {...register("docEducationCert")} />
            <PaperCheckbox th="ใบผ่านงาน" {...register("docWorkCert")} />
            <PaperField th="อื่นๆ" className="min-w-[160px] flex-1" {...register("docOther")} />
          </div>

          {/* ── Family Information ── */}
          <SectionBar en="Family Information" th="ประวัติครอบครัว" />

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[1.4fr_7rem_1fr]">
            <PaperField th="บิดา ชื่อ-สกุล" en="Father's name / surname" {...register("fatherName")} />
            <PaperField th="อายุ" type="number" suffix="ปี" style={{ textAlign: "center" }} {...register("fatherAge")} />
            <PaperField th="อาชีพ" en="Occupation" {...register("fatherOccupation")} />
            <PaperField th="มารดา ชื่อ-สกุล" en="Mother's name / surname" {...register("motherName")} />
            <PaperField th="อายุ" type="number" suffix="ปี" style={{ textAlign: "center" }} {...register("motherAge")} />
            <PaperField th="อาชีพ" en="Occupation" {...register("motherOccupation")} />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
            <PaperField th="ชื่อภรรยา/สามี" en="Name of wife / Husband" {...register("spouseName")} />
            <PaperField th="สถานที่ทำงาน" en="Working Place" {...register("spouseWorkplace")} />
            <PaperField th="ตำแหน่ง" en="Position" {...register("spousePosition")} />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <PaperField th="มีบุตร" type="text" inputMode="numeric" maxLength={2} suffix="คน"
              style={{ textAlign: numberOfChildrenValue.length > 5 ? "left" : "center" }}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ""); }}
              {...register("numberOfChildren")} />
            <PaperField th="มีพี่น้อง (รวมผู้สมัคร)" type="text" inputMode="numeric" maxLength={2} suffix="คน"
              style={{ textAlign: numberOfSiblingsValue.length > 5 ? "left" : "center" }}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ""); }}
              {...register("numberOfSiblings")} />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
            <PaperField th="ชาย" type="text" inputMode="numeric" maxLength={2} suffix="คน"
              style={{ textAlign: numberOfBrothersValue.length > 5 ? "left" : "center" }}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ""); }}
              {...register("numberOfBrothers")} />
            <PaperField th="หญิง" type="text" inputMode="numeric" maxLength={2} suffix="คน"
              style={{ textAlign: numberOfSistersValue.length > 5 ? "left" : "center" }}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ""); }}
              {...register("numberOfSisters")} />
            <PaperField th="เป็นบุตรคนที่" type="text" inputMode="numeric" maxLength={2}
              style={{ textAlign: childOrderValue.length > 5 ? "left" : "center" }}
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ""); }}
              {...register("childOrder")} />
          </div>


          {/* ── Education ── */}
          <SectionBar en="Education" th="การศึกษา" />
          <div className="table-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCell}>ระดับการศึกษา<br />Educational Level</th>
                <th className={thCell}>สถาบันการศึกษา<br />Institution</th>
                <th className={thCell}>สาขาวิชา<br />Major</th>
                <th className={`${thCell} w-20`}>ตั้งแต่<br />From</th>
                <th className={`${thCell} w-20`}>ถึง<br />To</th>
                <th className={`${thCell} w-16`}>เกรดเฉลี่ย<br />GPA</th>
              </tr>
            </thead>
            <tbody>
              {educationArray.fields.map((field, index) => (
                <tr key={field.id}>
                  <td className={`${tdCell} whitespace-nowrap px-2 text-[12px]`}>
                    {educationLevelLabel[field.level]?.th}
                    <br />
                    <span className="italic text-neutral-400">{educationLevelLabel[field.level]?.en}</span>
                  </td>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`education.${index}.institution` as const)} /></td>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`education.${index}.major` as const)} /></td>
                  <td className={tdCell}>
                    {(() => {
                      const reg = register(`education.${index}.yearFrom` as const);
                      return <DateCellInput reg={reg} />;
                    })()}
                  </td>
                  <td className={tdCell}>
                    {(() => {
                      const reg = register(`education.${index}.yearTo` as const);
                      return <DateCellInput reg={reg} />;
                    })()}
                  </td>
                  <td className={tdCell}><input type="number" step="0.01" className={`${cellInput} text-center`} {...register(`education.${index}.gpa` as const)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* ── Training ── */}
          <SectionBar en="Training / Internship Course / Activities" th="ประวัติการฝึกงาน / ฝึกอบรม / กิจกรรมพิเศษ" />
          <div className="table-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCell}>สถาบัน<br />Institution</th>
                <th className={thCell}>หลักสูตร / ตำแหน่ง<br />Course / Topic / Position</th>
                <th className={`${thCell} w-24`}>เดือน/ปี ที่เริ่ม<br />Date (From)</th>
                <th className={`${thCell} w-24`}>เดือน/ปี สำเร็จ<br />Date (To)</th>
                <th className={`${thCell} w-16`}>มี<br />Have</th>
                <th className={`${thCell} w-16`}>ไม่มี<br />Not have</th>
              </tr>
            </thead>
            <tbody>
              {trainingsArray.fields.map((field, index) => (
                <tr key={field.id}>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`trainings.${index}.institution` as const)} /></td>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`trainings.${index}.course` as const)} /></td>
                  <td className={tdCell}>
                    {(() => {
                      const reg = register(`trainings.${index}.dateFrom` as const);
                      return (
                        <DateCellInput reg={reg} />
                      );
                    })()}
                  </td>
                  <td className={tdCell}>
                    {(() => {
                      const reg = register(`trainings.${index}.dateTo` as const);
                      return (
                        <DateCellInput reg={reg} />
                      );
                    })()}
                  </td>
                  <td className={`${tdCell} text-center`}>
                    <input
                      type="checkbox"
                      className="sqbox"
                      checked={trainingsWatch[index]?.hasCertificate === true}
                      onChange={(e) => {
                        setValue(
                          `trainings.${index}.hasCertificate`,
                          e.target.checked ? true : (undefined as unknown as boolean),
                          { shouldDirty: true }
                        );
                      }}
                    />
                  </td>
                  <td className={`${tdCell} text-center`}>
                    <input
                      type="checkbox"
                      className="sqbox"
                      checked={trainingsWatch[index]?.hasCertificate === false}
                      onChange={(e) => {
                        setValue(
                          `trainings.${index}.hasCertificate`,
                          e.target.checked ? false : (undefined as unknown as boolean),
                          { shouldDirty: true }
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <button type="button" onClick={() => trainingsArray.append({ institution: "", hasCertificate: undefined as unknown as boolean })} className="no-print text-xs font-medium text-blue-600 hover:underline">
            + เพิ่มแถว
          </button>

          {/* ── Work Experience ── */}
          <SectionBar en="Work Experience" th="ประสบการณ์ทำงาน เรียงลำดับจากที่ทำงานล่าสุด" />
          <div className="table-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCell} rowSpan={2}>สถานที่ทำงาน<br />Company</th>
                <th className={thCell} colSpan={2}>ระยะเวลา / Time</th>
                <th className={thCell} rowSpan={2}>ตำแหน่งงาน<br />Position</th>
                <th className={thCell} rowSpan={2}>ลักษณะงาน<br />Job description</th>
                <th className={thCell} rowSpan={2}>ค่าจ้าง<br />Salary</th>
                <th className={thCell} rowSpan={2}>เหตุผลที่ลาออก<br />Reasons of resignation</th>
              </tr>
              <tr>
                <th className={`${thCell} w-24`}>เริ่ม / From</th>
                <th className={`${thCell} w-24`}>ถึง / To</th>
              </tr>
            </thead>
            <tbody>
              {workExperienceArray.fields.map((field, index) => (
                <tr key={field.id}>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`workExperience.${index}.company` as const)} /></td>
                  <td className={tdCell}>
                    {(() => {
                      const reg = register(`workExperience.${index}.dateFrom` as const);
                      return (
                        <DateCellInput reg={reg} />
                      );
                    })()}
                  </td>
                  <td className={tdCell}>
                    {(() => {
                      const reg = register(`workExperience.${index}.dateTo` as const);
                      return (
                        <DateCellInput reg={reg} />
                      );
                    })()}
                  </td>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`workExperience.${index}.position` as const)} /></td>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`workExperience.${index}.jobDescription` as const)} /></td>
                  <td className={tdCell}>
                    {(() => {
                      const { onChange, ...reg } = register(`workExperience.${index}.salary` as const);
                      return (
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          className={`${cellInput} text-center`}
                          onChange={(e) => {
                            e.target.value = formatThaiSalary(e.target.value);
                            void onChange(e);
                          }}
                          {...reg}
                        />
                      );
                    })()}
                  </td>
                  <td className={tdCell}><AutoGrowCellInput reg={register(`workExperience.${index}.reasonForLeaving` as const)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <button type="button" onClick={() => workExperienceArray.append({ company: "" })} className="no-print text-xs font-medium text-blue-600 hover:underline">
            + เพิ่มแถว
          </button>

          {/* ── Language Ability ── */}
          <SectionBar en="Language Ability" th="ภาษา" />
          <div className="table-scroll">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCell} rowSpan={2}>ภาษา<br />Language</th>
                <th className={thCell} colSpan={3}>ฟัง-พูด (Listening-Speaking)</th>
                <th className={thCell} colSpan={3}>อ่าน (Reading)</th>
                <th className={thCell} colSpan={3}>เขียน (Writing)</th>
              </tr>
              <tr>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Fragment key={i}>
                    <th className={`${thCell} w-14`}>ดี<br />Good</th>
                    <th className={`${thCell} w-14`}>ปานกลาง<br />Fair</th>
                    <th className={`${thCell} w-14`}>พอใช้<br />Poor</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {languageSkillsArray.fields.map((field, index) => (
                <tr key={field.id}>
                  <td className={`${tdCell} whitespace-nowrap px-2 text-[13px]`}>
                    {field.language === "other" ? (
                      <span className="flex items-baseline gap-1">
                        อื่นๆ
                        <input className={cellInput} placeholder="ระบุ" {...register(`languageSkills.${index}.languageOther` as const)} />
                      </span>
                    ) : (
                      languageLabel[field.language]
                    )}
                  </td>
                  {(["listening", "reading", "writing"] as const).map((skill) => (
                    <Fragment key={skill}>
                      {(["good", "fair", "poor"] as const).map((level) => {
                        const fieldName = `languageSkills.${index}.${skill}` as const;
                        return (
                          <td key={`${skill}-${level}`} className={`${tdCell} text-center`}>
                            <input
                              type="checkbox"
                              className="sqbox"
                              checked={watch(fieldName) === level}
                              onChange={(e) => setValue(fieldName, (e.target.checked ? level : undefined) as never, { shouldDirty: true })}
                            />
                          </td>
                        );
                      })}
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* ── Special Ability ── */}
          <SectionBar en="Special Ability" th="ความสามารถพิเศษ" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[15px]">ทักษะการพิมพ์ :</span>
            <PaperField th="ไทย" type="number" suffix="คำ/นาที" className="w-40" style={{ textAlign: "center" }} {...register("typingSpeedThai")} />
            <PaperField th="อังกฤษ" type="number" suffix="คำ/นาที" className="w-44" style={{ textAlign: "center" }} {...register("typingSpeedEnglish")} />
            <YesNo th="พิมพ์สัมผัส" name="touchTyping" register={register} noLabel="ไม่ได้" yesLabel="ได้" />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <YesNo th="คอมพิวเตอร์ :" name="computerSkills" register={register} noLabel="ไม่ได้" yesLabel="ได้" />
            <PaperField th="ระบุ" className="min-w-[220px] flex-1" {...register("computerSkillsDetail")} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <YesNo th="ขับรถยนต์ :" name="carDriver" register={register} noLabel="ไม่ได้" yesLabel="ได้" />
            <YesNo th="มีพาหนะ" name="hasOwnCar" register={register} noLabel="ไม่มี" yesLabel="มี" />
            <PaperField th="ใบขับขี่เลขที่" className="min-w-[180px] flex-1" {...register("carLicenseNo")} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <YesNo th="ขับรถจักรยานยนต์ :" name="motorcycleDriver" register={register} noLabel="ไม่ได้" yesLabel="ได้" />
            <YesNo th="มีพาหนะ" name="hasOwnMotorcycle" register={register} noLabel="ไม่มี" yesLabel="มี" />
            <PaperField th="ใบขับขี่เลขที่" className="min-w-[180px] flex-1" {...register("motorcycleLicenseNo")} />
          </div>

          <PaperField th="ความสามารถในการใช้เครื่องใช้สำนักงาน" en="Office Machine" {...register("officeMachineSkills")} />
          <PaperField th="งานอดิเรก / กีฬาที่ชอบ / ความรู้พิเศษ ระบุ" en="Hobbies / Favorite Sport / Special knowledge" {...register("hobbies")} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <YesNo th="สามารถไปปฏิบัติงานต่างจังหวัด" name="canWorkUpCountry" register={register} noLabel="ไม่ได้" yesLabel="ได้" />
            <PaperField th="อื่นๆ ระบุ" className="min-w-[200px] flex-1" {...register("canWorkUpCountryOther")} />
          </div>

          <PaperField th="กรณีฉุกเฉินบุคคลที่ติดต่อได้ ชื่อ-นามสกุล" required error={errors.emergencyContactName?.message} {...register("emergencyContactName")} />
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr_1fr]">
            <PaperField th="เกี่ยวข้องกับผู้สมัคร" {...register("emergencyContactRelation")} />
            <PaperField th="ที่อยู่" {...register("emergencyContactAddress")} />
            <PaperField th="โทร." required error={errors.emergencyContactPhone?.message} inputMode="tel" maxLength={12} format={formatThaiPhone} {...register("emergencyContactPhone")} />
          </div>
          <p className="-mt-1 text-[10px] italic text-neutral-400">Person to be notified in case of emergency / Related to the applicant as / Address / Tel.</p>

          <PaperField th="ทราบข่าวการรับสมัครจาก" en="Sources of job information" {...register("jobInfoSource")} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <YesNo th="ท่านเคยป่วยหนักและเป็นโรคติดต่อร้ายแรงมาก่อนหรือไม่?" name="seriousIllness" register={register} noLabel="ไม่เคย" yesLabel="เคย" />
            <PaperField th="ถ้าเคยโปรดระบุชื่อโรค" className="min-w-[220px] flex-1" {...register("illnessDetail")} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <YesNo th="ท่านเคยสมัครงานกับบริษัทฯ นี้มาก่อนหรือไม่" name="appliedBefore" register={register} noLabel="ไม่เคย" yesLabel="เคย" />
            <PaperField th="ถ้าเคย เมื่อไร?" className="min-w-[200px] flex-1" {...register("appliedBeforeWhen")} />
          </div>

          <div>
            <p className="text-[15px]">ท่านทราบข้อมูลการรับสมัครงานจากช่องทางใหน? <span className="text-[10px] italic text-neutral-400">How did you hear about us?</span></p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <PaperCheckbox th="อินเตอร์เน็ต โปรดระบุ" value="internet" type="radio" {...register("infoSource")} />
              <PaperField th="web" className="w-48" {...register("infoSourceInternetDetail")} />
              <PaperCheckbox th="ประกาศ" value="announcement" type="radio" {...register("infoSource")} />
              <PaperCheckbox th="เพื่อน" value="friend" type="radio" {...register("infoSource")} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <PaperCheckbox th="อื่นๆ โปรดระบุ" value="other" type="radio" {...register("infoSource")} />
              <PaperField th="" className="w-48" {...register("infoSourceDetail")} />
            </div>
          </div>

          <PaperField th="เขียนชื่อญาติ / เพื่อน ที่ทำงานอยู่ในบริษัทฯ ซึ่งท่านรู้จักดี" en="Give the name of relatives / friends, working with us known to you" {...register("relativesInCompany")} />

          <div>
            <p className="text-[15px]">เขียนชื่อ ที่อยู่ โทรศัพท์ และอาชีพของผู้ที่อ้างถึง 2 คน (ซึ่งไม่ใช่ญาติ หรือนายจ้างเดิม) ที่รู้จักคุ้นเคยตัวท่านดี</p>
            <p className="text-[10px] italic text-neutral-400">List name, address, telephone and occupation of 2 references (Other than relatives or former employers)</p>
            <div className="mt-1 space-y-2">
              {referencesArray.fields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    <PaperField th={`${index + 1}. ชื่อ`} {...register(`references.${index}.name` as const)} />
                    <PaperField th="ที่อยู่" {...register(`references.${index}.address` as const)} />
                  </div>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    <PaperField th="โทรศัพท์" inputMode="tel" {...register(`references.${index}.phone` as const)} />
                    <PaperField th="อาชีพ" {...register(`references.${index}.occupation` as const)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PaperTextArea th="กรุณาแนะนำตัวท่านเอง เพื่อให้บริษัทรู้จักตัวท่านดีขึ้น" en="Please provide any further information about yourself which will allow our company to know you better" rows={4} {...register("selfIntroduction")} />

          {/* ── Org chart & responsibilities (last-workplace) ── */}
          <OrgChartBuilder
            className="mt-8"
            onPayloadChange={(payload) => {
              orgChartPayloadRef.current = payload;
            }}
            onImageChange={(image) => {
              orgChartImageRef.current = image;
            }}
          />
          <PaperTextArea th="จงอธิบายหน้าที่รับผิดชอบโดยละเอียด (ที่ทำงานล่าสุด)" rows={6} className="mt-4" {...register("jobResponsibilities")} />

          {/* ── Certification ── */}
          <div className="mt-3 border-t border-neutral-400 pt-2">
            <p className="text-[12px] leading-relaxed text-neutral-800">
              ข้าพเจ้าขอรับรองว่า ข้อความดังกล่าวทั้งหมดในใบสมัครนี้เป็นความจริงทุกประการ หลังจากบริษัทจ้างเข้ามาทำงานแล้วปรากฏว่า
              ข้อความในใบสมัครงาน เอกสารที่นำมาแสดง หรือรายละเอียดที่ให้ไว้ไม่เป็นความจริง บริษัทฯ
              มีสิทธิ์ที่จะเลิกจ้างข้าพเจ้าได้โดยไม่ต้องจ่ายเงินชดเชยหรือค่าเสียหายใดๆ ทั้งสิ้น
            </p>
            <p className="mt-1 text-[10px] italic leading-relaxed text-neutral-400">
              I certify all statement given in this application form is true if any is found to be untrue after engagement. The
              Company has right to terminate my employment without any compensation or severance pay what so ever.
            </p>
            <label className="mt-2 flex items-start gap-2 text-[14px]">
              <input type="checkbox" className="sqbox mt-0.5" {...register("consentTruthful")} />
              ข้าพเจ้ารับทราบและยอมรับเงื่อนไขข้างต้น
            </label>
            {errors.consentTruthful ? <p className="mt-1 text-[12px] text-red-600">{errors.consentTruthful.message}</p> : null}
          </div>

          {/* ── Signature & Date — right-aligned, stacked, labels aligned ── */}
          <div className="mt-4 flex justify-end">
            <div className="flex flex-col gap-2" style={{ width: "260px" }}>
              <PaperField
                th="ลงชื่อ"
                suffix="ผู้สมัคร"
                className="w-full"
                {...register("signatureDataUrl")}
              />
              <ThaiDateField
                th="วันที่"
                className="w-full"
                required
                inputCentered
                error={errors.signedDate?.message}
                registration={register("signedDate")}
              />
            </div>
          </div>




          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

          <div className="no-print flex flex-col items-end gap-2 pb-10 pt-4">
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="rounded-md bg-neutral-700 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-neutral-800 disabled:opacity-60"
              >
                {generatingPdf ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
              </button>
              <button type="submit" disabled={submitState === "submitting"} className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60">
                {submitState === "submitting" ? "กำลังส่งใบสมัคร..." : "ส่งใบสมัครงาน"}
              </button>
            </div>

          </div>
        </form>
        </FormProvider>
      </div>
    </main>
  );
}
