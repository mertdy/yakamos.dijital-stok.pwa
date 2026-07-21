import { collection, doc, writeBatch } from 'firebase/firestore';
import {
  PLATFORM_SUPPORT_ADMIN_EMAIL,
  WIREPUSHER_ADMIN_DEVICE_ID,
  WIREPUSHER_NOTIFICATION_TYPE
} from '@/core/config/support';
import { db } from '@/core/firebase/config';
import type { Company } from '@/core/types/tenant';
import { getRecentTechnicalErrors } from './technicalContext';

export type SupportReportType = 'BUG' | 'SUPPORT' | 'SUGGESTION';

export interface SupportScreenshot {
  dataUrl: string;
  name: string;
  sizeBytes: number;
}

export interface SupportReportInput {
  type: SupportReportType;
  title: string;
  description: string;
  includeTechnicalContext: boolean;
  screenshot?: SupportScreenshot | null;
}

export interface SupportReport {
  id: string;
  type: SupportReportType;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdBy: string;
  createdByEmail: string | null;
  recipientEmail: string;
  companyId: string;
  companyName: string;
  route: string;
  appVersion: string;
  client: { userAgent: string; isOnline: boolean };
  technicalErrors: ReturnType<typeof getRecentTechnicalErrors>;
  screenshot?: SupportScreenshot | null;
  createdAt: string;
}

const reportTypeLabel: Record<SupportReportType, string> = {
  BUG: 'Hata bildirimi',
  SUPPORT: 'Destek isteği',
  SUGGESTION: 'Öneri'
};

const notificationMessage = (report: SupportReport) =>
  `${report.companyName} · ${reportTypeLabel[report.type]}\n${report.title}\n${report.description}`
    .replace(/\s+/g, ' ')
    .slice(0, 350);

export const sendWirePusherNotification = (report: SupportReport) => {
  const url = new URL('https://wirepusher.com/send');
  url.search = new URLSearchParams({
    id: WIREPUSHER_ADMIN_DEVICE_ID,
    title: 'Yeni destek kaydı',
    message: notificationMessage(report),
    type: WIREPUSHER_NOTIFICATION_TYPE
  }).toString();
  return fetch(url.toString(), {
    method: 'GET',
    mode: 'no-cors',
    keepalive: true
  });
};

export const createSupportReport = async ({
  input,
  company,
  userId,
  userEmail
}: {
  input: SupportReportInput;
  company: Company;
  userId: string;
  userEmail?: string | null;
}) => {
  const reportRef = doc(collection(db, 'supportReports'));
  const notificationRef = doc(collection(db, 'notifications'));
  const report: SupportReport = {
    id: reportRef.id,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    status: 'OPEN',
    createdBy: userId,
    createdByEmail: userEmail ?? null,
    recipientEmail: PLATFORM_SUPPORT_ADMIN_EMAIL,
    companyId: company.id,
    companyName: company.name,
    route: window.location.pathname,
    appVersion: import.meta.env.VITE_APP_VERSION || 'web',
    client: {
      userAgent: navigator.userAgent.slice(0, 500),
      isOnline: navigator.onLine
    },
    technicalErrors: input.includeTechnicalContext
      ? getRecentTechnicalErrors()
      : [],
    screenshot: input.screenshot ?? null,
    createdAt: new Date().toISOString()
  };
  const batch = writeBatch(db);
  batch.set(reportRef, report);
  batch.set(notificationRef, {
    id: notificationRef.id,
    kind: 'SUPPORT_REPORT',
    recipientEmail: PLATFORM_SUPPORT_ADMIN_EMAIL,
    title: 'Yeni destek kaydı',
    body: notificationMessage(report),
    resourceType: 'supportReport',
    resourceId: report.id,
    createdBy: userId,
    companyId: company.id,
    isRead: false,
    createdAt: report.createdAt,
    delivery: { transport: 'wirepusher-client', status: 'REQUESTED' }
  });
  await batch.commit();
  void sendWirePusherNotification(report).catch(error => {
    console.warn('WirePusher notification request could not be sent', error);
  });
  return report;
};

const readFileAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(blob);
  });

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Görsel açılamadı.'));
    };
    image.src = url;
  });

export const prepareSupportScreenshot = async (
  file: File
): Promise<SupportScreenshot> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Yalnızca görsel dosyası ekleyebilirsiniz.');
  }
  const image = await loadImage(file);
  const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.78;
  let blob: Blob | null = null;
  while (quality >= 0.4) {
    blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/webp', quality)
    );
    if (blob && blob.size <= 350 * 1024) break;
    quality -= 0.12;
  }
  if (!blob || blob.size > 350 * 1024) {
    throw new Error(
      'Görsel 350 KB altına indirilemedi. Daha küçük bir ekran görüntüsü seçin.'
    );
  }
  return {
    dataUrl: await readFileAsDataUrl(blob),
    name: file.name.replace(/\.[^/.]+$/, '') + '.webp',
    sizeBytes: blob.size
  };
};
