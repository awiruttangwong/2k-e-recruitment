import Link from "next/link";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  submitted: "ใหม่",
  reviewing: "กำลังพิจารณา",
  interview: "นัดสัมภาษณ์",
  hired: "รับเข้าทำงาน",
  rejected: "ไม่ผ่านการพิจารณา",
};

export default async function ApplicationsListPage() {
  const db = await getDb();
  const rows = await db
    .select({
      id: applications.id,
      firstName: applications.firstName,
      lastName: applications.lastName,
      positionApplied1: applications.positionApplied1,
      mobile: applications.mobile,
      status: applications.status,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .orderBy(desc(applications.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">ใบสมัครงานทั้งหมด</h1>
      <p className="mt-1 text-sm text-neutral-500">{rows.length} รายการ</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">ตำแหน่งที่สมัคร</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">เบอร์โทร</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">สถานะ</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600">วันที่สมัคร</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-neutral-900">
                  {row.firstName} {row.lastName}
                </td>
                <td className="px-4 py-3 text-neutral-600">{row.positionApplied1}</td>
                <td className="px-4 py-3 text-neutral-600">{row.mobile}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {statusLabel[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(row.createdAt).toLocaleString("th-TH")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/applications/${row.id}`} className="text-blue-600 hover:underline">
                    ดูรายละเอียด
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  ยังไม่มีใบสมัครงาน
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
