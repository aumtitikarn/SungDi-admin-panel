"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTables, createBulkTables, createSingleTable, deleteTable, type TableItem, TablesError } from "@/lib/tablesClient";
import Swal from "sweetalert2";

export default function SeatsPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [bulkCount, setBulkCount] = useState<string>("");
  const [singleTable, setSingleTable] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ดึงข้อมูลโต๊ะเมื่อ component mount
  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setFetching(true);
      const response = await getTables();
      if (response.success) {
        setTables(response.data);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof TablesError ? error.message : "ไม่สามารถดึงข้อมูลโต๊ะได้",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleAddBulk = async () => {
    const count = Number(bulkCount);
    if (!count || count <= 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุจำนวน",
        text: "กรุณาระบุจำนวนโต๊ะที่ต้องการสร้าง (ต้องมากกว่า 0)",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createBulkTables(count);
      if (response.success) {
        setBulkCount("");
        await fetchTables(); // ดึงข้อมูลใหม่
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || `สร้างโต๊ะสำเร็จ ${count} โต๊ะ`,
        });
      }
    } catch (error) {
      console.error("Error creating bulk tables:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof TablesError ? error.message : "ไม่สามารถสร้างโต๊ะได้",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingle = async () => {
    const num = Number(singleTable);
    if (!num || num <= 0) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาระบุเลขโต๊ะ",
        text: "กรุณาระบุเลขโต๊ะที่ต้องการสร้าง (ต้องมากกว่า 0)",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await createSingleTable(num);
      if (response.success) {
        setSingleTable("");
        await fetchTables(); // ดึงข้อมูลใหม่
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || `สร้าง QR สำหรับโต๊ะหมายเลข ${num} สำเร็จ`,
        });
      }
    } catch (error) {
      console.error("Error creating single table:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof TablesError ? error.message : "ไม่สามารถสร้างโต๊ะได้",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableNumber: number) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการลบ",
      text: `คุณต้องการลบโต๊ะหมายเลข ${tableNumber} ใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await deleteTable(tableNumber);
      if (response.success) {
        await fetchTables(); // ดึงข้อมูลใหม่
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: response.message || `ลบโต๊ะหมายเลข ${tableNumber} สำเร็จ`,
        });
      }
    } catch (error) {
      console.error("Error deleting table:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: error instanceof TablesError ? error.message : "ไม่สามารถลบโต๊ะได้",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">จัดการที่นั่ง / โต๊ะ</h1>
          <p className="text-sm text-zinc-500">
            จัดการจำนวนโต๊ะ สร้างและดู QR Code สำหรับแต่ละโต๊ะ
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        {/* การเพิ่มโต๊ะ */}
        <Card>
          <CardHeader>
            <CardTitle>เพิ่มโต๊ะ</CardTitle>
            <CardDescription>
              เลือกเพิ่มโต๊ะแบบระบุจำนวน หรือระบุเลขโต๊ะเฉพาะเจาะจง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* เพิ่มแบบระบุจำนวน */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">เพิ่มโต๊ะตามจำนวน</p>
              <div className="space-y-1.5">
                <Label htmlFor="bulkCount">จำนวนโต๊ะที่ต้องการสร้าง</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="bulkCount"
                    type="number"
                    min={1}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    placeholder="เช่น 5"
                  />
                  <Button type="button" onClick={handleAddBulk} disabled={loading}>
                    {loading ? "กำลังสร้าง..." : "สร้างตามจำนวน"}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  ระบบจะสร้างเลขโต๊ะถัดจากเลขสูงสุดที่มีอยู่ในปัจจุบัน
                </p>
              </div>
            </div>

            {/* เพิ่มแบบระบุเลขโต๊ะ */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">สร้าง QR สำหรับเลขโต๊ะเฉพาะ</p>
              <div className="space-y-1.5">
                <Label htmlFor="singleTable">เลขโต๊ะ</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="singleTable"
                    type="number"
                    min={1}
                    value={singleTable}
                    onChange={(e) => setSingleTable(e.target.value)}
                    placeholder="เช่น 12"
                  />
                  <Button type="button" onClick={handleAddSingle} disabled={loading}>
                    {loading ? "กำลังสร้าง..." : "สร้าง QR โต๊ะนี้"}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  ถ้ามีเลขโต๊ะนี้อยู่แล้ว ระบบจะไม่สร้างซ้ำ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* รายการโต๊ะ + QR */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>รายการโต๊ะ</CardTitle>
                <CardDescription>
                  แสดง QR Code สำหรับแต่ละโต๊ะ สามารถลบโต๊ะได้
                </CardDescription>
              </div>
              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                จำนวนโต๊ะทั้งหมด: {tables.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed text-sm text-zinc-500">
                กำลังโหลดข้อมูล...
              </div>
            ) : tables.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed text-sm text-zinc-500">
                ยังไม่มีโต๊ะในระบบ ลองเพิ่มโต๊ะจากด้านซ้ายมือก่อนนะ
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tables
                  .slice()
                  .sort((a, b) => a.tableNumber - b.tableNumber)
                  .map((table) => (
                    <div
                      key={table.tableNumber}
                      className="flex flex-col justify-between rounded-lg border bg-white p-3 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          โต๊ะ {table.tableNumber}
                        </p>
                      </div>
                      <div className="mb-3 flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={table.qrUrl}
                          alt={`QR โต๊ะ ${table.tableNumber}`}
                          className="h-32 w-32 rounded-md border bg-white object-contain"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDeleteTable(table.tableNumber)
                          }
                          className="text-red-600 hover:text-red-700"
                        >
                          ลบโต๊ะ
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
