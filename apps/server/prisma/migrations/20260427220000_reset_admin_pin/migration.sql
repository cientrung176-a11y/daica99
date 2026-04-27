-- Reset admin PIN về mặc định 123456 (chạy 1 lần)
DELETE FROM "Setting" WHERE "key" = 'rustdesk_admin_pin';
