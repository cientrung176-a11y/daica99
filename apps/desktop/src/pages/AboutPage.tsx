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
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Có kông mày sắt, có ngày lên cim</p>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Phiên bản:</span>
            <span className="font-medium">1.0.3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Nền tảng:</span>
            <span className="font-medium">Đi một ngày đàng, học một sàng khôn</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">cucak:</span>
            <span className="font-medium">Lửa thử vàng, gian nan thử sức</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Thương em:</span>
            <span className="font-medium">Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao</span>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <h4 className="font-medium mb-2">Giá trị truyền đời</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Có chí thì nên</li>
            <li>• Thất bại là mẹ thành công</li>
            <li>• Uống nước nhớ nguồn</li>
            <li>• Tích tiểu thành đại</li>
            <li>• Chậm mà chắc</li>
            <li>• Học ăn học nói học gói học mở</li>
            <li>• Tre già măng mọc</li>
            <li>• Gần mực thì đen, gần đèn thì sáng</li>
            <li>• Thuận vợ thuận chồng, tát biển Đông cũng cạn</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
