-- Reset admin PIN về mặc định 123456 (chạy 1 lần, an toàn nếu bảng chưa tồn tại)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Setting'
  ) THEN
    DELETE FROM "Setting" WHERE "key" = 'rustdesk_admin_pin';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- ignore any error
END $$;
