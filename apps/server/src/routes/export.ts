import { Router } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../prisma.js';
import { requireAuth } from '../auth/middleware.js';

const router = Router();

const statusDeviceMap: Record<string, string> = {
  TOT: 'Tốt', LOI: 'Lỗi', CANH_BAO: 'Cảnh báo', BAO_TRI: 'Bảo trì',
};
const statusLogMap: Record<string, string> = {
  HOAN_THANH: 'Hoàn thành', DANG_XU_LY: 'Đang xử lý', CHO_XU_LY: 'Chờ xử lý',
};

// GET /api/export/devices — Xuất danh sách thiết bị ra Excel
router.get('/devices', requireAuth, async (_req, res) => {
  const devices = await prisma.device.findMany({ orderBy: { name: 'asc' } });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Thiết bị');

  ws.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Tên thiết bị', key: 'name', width: 28 },
    { header: 'Loại', key: 'type', width: 18 },
    { header: 'Hãng', key: 'brand', width: 15 },
    { header: 'Model', key: 'model', width: 15 },
    { header: 'Serial', key: 'serial', width: 20 },
    { header: 'Phòng ban', key: 'department', width: 18 },
    { header: 'Người phụ trách', key: 'owner', width: 20 },
    { header: 'Ngày mua', key: 'purchaseDate', width: 14 },
    { header: 'Bảo hành đến', key: 'warrantyUntil', width: 14 },
    { header: 'Trạng thái', key: 'status', width: 14 },
    { header: 'Ghi chú', key: 'note', width: 30 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0E4FF' } };

  devices.forEach((d, i) => {
    ws.addRow({
      stt: i + 1,
      name: d.name,
      type: d.type,
      brand: d.brand ?? '',
      model: d.model ?? '',
      serial: d.serial ?? '',
      department: d.department ?? '',
      owner: d.owner ?? '',
      purchaseDate: d.purchaseDate ? new Date(d.purchaseDate).toLocaleDateString('vi-VN') : '',
      warrantyUntil: d.warrantyUntil ? new Date(d.warrantyUntil).toLocaleDateString('vi-VN') : '',
      status: statusDeviceMap[d.status] ?? d.status,
      note: d.note ?? '',
    });
  });

  ws.eachRow((row, idx) => {
    if (idx > 1 && idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="thiet-bi-${Date.now()}.xlsx"`);
  res.setHeader('Content-Length', buffer.byteLength);
  res.end(buffer);
});

const deviceTypeLabel: Record<string, string> = {
  MAY_TINH:   'Máy tính',      MAY_IN:    'Máy in',
  SIEU_AM:    'Máy siêu âm',   XET_NGHIEM:'Máy xét nghiệm',
  CAMERA:     'Camera',        MANG_WIFI: 'Mạng / Wifi',
  DIEN_DEN:   'Điện / Đèn',   DIEU_HOA:  'Điều hòa',
  KHAC:       'Khác',
};
const priorityLabel: Record<string, string> = {
  THAP: 'Thấp', TRUNG_BINH: 'Trung bình', CAO: 'Cao', KHAN_CAP: 'Khẩn cấp',
};

const LOG_COLS: Partial<ExcelJS.Column>[] = [
  { header: 'STT',              key: 'stt',         width: 6  },
  { header: 'Ngày sửa',        key: 'happenedAt',  width: 18 },
  { header: 'Loại thiết bị',   key: 'deviceType',  width: 18 },
  { header: 'Thiết bị / HM',   key: 'device',      width: 24 },
  { header: 'Vị trí',          key: 'location',    width: 20 },
  { header: 'Ưu tiên',         key: 'priority',    width: 14 },
  { header: 'Mô tả lỗi',       key: 'issue',       width: 35 },
  { header: 'Nguyên nhân',     key: 'cause',       width: 28 },
  { header: 'Cách xử lý',      key: 'resolution',  width: 35 },
  { header: 'Người thực hiện', key: 'technician',  width: 20 },
  { header: 'Thời gian (phút)',key: 'durationMin', width: 16 },
  { header: 'Chi phí (VNĐ)',   key: 'cost',        width: 16 },
  { header: 'Trạng thái',      key: 'status',      width: 16 },
];

function addLogSheet(wb: ExcelJS.Workbook, sheetName: string, logs: any[], headerColor: string) {
  const ws = wb.addWorksheet(sheetName);
  ws.columns = LOG_COLS;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };

  logs.forEach((l, i) => {
    const deviceName = l.deviceType === 'MAY_TINH' && l.computer
      ? l.computer.name
      : (l.deviceName || deviceTypeLabel[l.deviceType] || '');
    ws.addRow({
      stt:        i + 1,
      happenedAt: new Date(l.happenedAt).toLocaleString('vi-VN'),
      deviceType: deviceTypeLabel[l.deviceType] ?? (l.deviceType || ''),
      device:     deviceName,
      location:   l.location ?? '',
      priority:   priorityLabel[l.priority] ?? (l.priority || ''),
      issue:      l.issue,
      cause:      l.cause ?? '',
      resolution: l.resolution,
      technician: l.technicianName || l.user.fullName,
      durationMin:l.durationMin ?? '',
      cost:       l.cost ? l.cost.toLocaleString('vi-VN') : '',
      status:     statusLogMap[l.status] ?? l.status,
    });
    if (i % 2 === 1) {
      ws.getRow(i + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    }
  });
}

// GET /api/export/techlogs — Xuất nhật ký kỹ thuật ra Excel (tách sheet theo loại thiết bị)
router.get('/techlogs', requireAuth, async (_req, res) => {
  const logs = await prisma.techLog.findMany({
    orderBy: [{ deviceType: 'asc' }, { happenedAt: 'desc' }],
    include: {
      user:     { select: { fullName: true, username: true } },
      computer: { select: { name: true } },
    },
    take: 1000,
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Đại Ca 99 Bắc Ninh';

  // Sheet "Tất cả"
  addLogSheet(wb, 'Tất cả', logs, 'FFFFE0B2');

  // Sheets per device type
  const sheetColors: Record<string, string> = {
    MAY_TINH:'FFD0E4FF', MAY_IN:'FFE8E8E8', SIEU_AM:'FFFCE4EC',
    XET_NGHIEM:'FFF3E5F5', CAMERA:'FFE8EAF6', MANG_WIFI:'FFE0F7FA',
    DIEN_DEN:'FFFFF9C4', DIEU_HOA:'FFE0F2F1', KHAC:'FFFFF3E0',
  };

  const byType = logs.reduce((acc: Record<string, any[]>, l: any) => {
    const k = l.deviceType || 'KHAC';
    (acc[k] = acc[k] || []).push(l);
    return acc;
  }, {});

  for (const [type, group] of Object.entries(byType) as [string, any[]][]) {
    if (!group || group.length === 0) continue;
    const label = deviceTypeLabel[type] ?? type;
    const color = sheetColors[type] ?? 'FFFFF3E0';
    addLogSheet(wb, label, group, color);
  }

  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="nhat-ky-ky-thuat-${Date.now()}.xlsx"`);
  res.setHeader('Content-Length', buffer.byteLength);
  res.end(buffer);
});

// GET /api/export/computers — Xuất danh sách máy tính
router.get('/computers', requireAuth, async (_req, res) => {
  const computers = await prisma.computer.findMany({ orderBy: { name: 'asc' } });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Máy tính');

  ws.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Tên máy', key: 'name', width: 25 },
    { header: 'IP nội bộ', key: 'ipInternal', width: 16 },
    { header: 'Vị trí', key: 'location', width: 20 },
    { header: 'Người dùng', key: 'currentUser', width: 18 },
    { header: 'Hệ điều hành', key: 'windows', width: 18 },
    { header: 'CPU', key: 'cpu', width: 20 },
    { header: 'RAM', key: 'ram', width: 10 },
    { header: 'Ổ cứng', key: 'disk', width: 12 },
    { header: 'Trạng thái', key: 'isOnline', width: 14 },
    { header: 'Lần cuối online', key: 'lastSeenAt', width: 18 },
    { header: 'Ghi chú', key: 'note', width: 30 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5D5' } };

  computers.forEach((c, i) => {
    ws.addRow({
      stt: i + 1,
      name: c.name,
      ipInternal: c.ipInternal ?? '',
      location: c.location ?? '',
      currentUser: c.currentUser ?? '',
      windows: c.windows ?? '',
      cpu: c.cpu ?? '',
      ram: c.ram ?? '',
      disk: c.disk ?? '',
      isOnline: c.isOnline ? 'Trực tuyến' : 'Ngoại tuyến',
      lastSeenAt: c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleString('vi-VN') : '',
      note: c.note ?? '',
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="may-tinh-${Date.now()}.xlsx"`);
  res.setHeader('Content-Length', buffer.byteLength);
  res.end(buffer);
});

export default router;
