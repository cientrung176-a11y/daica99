import BrandLogo from '../components/BrandLogo';

export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold">Giới thiệu</h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <BrandLogo variant="full" size={130} />
          </div>
          <h3 className="text-xl font-bold mt-1">ĐẠI CA 99 BẮC NINH</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Phần mềm quản lý thiết bị phòng khám</p>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Phiên bản:</span>
            <span className="font-medium">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nền tảng:</span>
            <span className="font-medium">Electron + React + TypeScript</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Backend:</span>
            <span className="font-medium">Node.js + Express + PostgreSQL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Đồng bộ:</span>
            <span className="font-medium">Socket.IO (thời gian thực)</span>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h4 className="font-medium mb-2">Chức năng chính</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Quản lý thiết bị y tế</li>
            <li>• Quản lý máy tính phòng khám</li>
            <li>• Giám sát trực tuyến / ngoại tuyến</li>
            <li>• Điều khiển từ xa</li>
            <li>• Nhật ký sửa chữa kỹ thuật</li>
            <li>• Đồng bộ dữ liệu qua Internet</li>
            <li>• Bảng điều khiển thống kê</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
