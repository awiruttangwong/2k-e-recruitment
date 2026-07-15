import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-blue-600">2K LOGISTICS CO., LTD.</p>
      <h1 className="mt-2 text-3xl font-bold text-neutral-900">ระบบรับสมัครงานออนไลน์</h1>
      <p className="mt-3 max-w-md text-neutral-600">
        กรอกใบสมัครงาน (FM-HR-03) ออนไลน์ ไม่ต้องพิมพ์หรือเขียนด้วยมือ
      </p>
      <Link
        href="/apply"
        className="mt-6 rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
      >
        เริ่มกรอกใบสมัครงาน
      </Link>
      <Link href="/admin/applications" className="mt-4 text-sm text-neutral-400 hover:text-neutral-600">
        สำหรับเจ้าหน้าที่ HR
      </Link>
    </main>
  );
}
