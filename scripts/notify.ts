/**
 * 通知 CLI：比對訂閱與最新演出，寄出開賣／新演出通知。
 * 設定 SMTP_HOST 等環境變數才會真的寄信；否則 dry-run 印出。
 * 建議在每次 `npm run scrape` 之後執行。
 */
import { runNotifications } from '../src/lib/server/notify';

const { sent, dryRun } = await runNotifications();
console.log(`\n${dryRun ? '[dry-run] ' : ''}通知處理完成，共 ${sent} 位訂閱者有新演出。`);
