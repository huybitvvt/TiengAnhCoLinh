import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const DEFAULT_UPLOAD_TIMEOUT_MS = 8000;

const getUploadTimeoutMs = () => {
    const configured = Number(import.meta.env.VITE_CHECKIN_PHOTO_UPLOAD_TIMEOUT_MS);
    return Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_UPLOAD_TIMEOUT_MS;
};

const shouldSkipStorageUpload = () =>
    import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Upload ảnh quá ${Math.round(timeoutMs / 1000)} giây`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

/**
 * Upload a check-in photo to Firebase Storage
 * @param staffId - Staff ID
 * @param photoBlob - Photo blob from camera capture
 * @param type - 'checkin' or 'checkout'
 * @returns Download URL of uploaded photo
 */
export const uploadCheckInPhoto = async (
    staffId: string,
    photoBlob: Blob,
    type: 'checkin' | 'checkout'
): Promise<string> => {
    const timestamp = Date.now();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${date}_${type}_${timestamp}.jpg`;
    const storagePath = `checkin-photos/${staffId}/${fileName}`;

    const storageRef = ref(storage, storagePath);

    // Upload the blob
    await uploadBytes(storageRef, photoBlob, {
        contentType: 'image/jpeg',
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
};

/**
 * Compress camera image before upload or Firestore fallback.
 */
export const compressPhotoDataUrl = (
    dataUrl: string,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> => {
    const { maxWidth = 640, maxHeight = 480, quality = 0.65 } = options;

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Không thể nén ảnh chấm công'));
                return;
            }

            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.onerror = () => reject(new Error('Không thể đọc ảnh chấm công'));
        image.src = dataUrl;
    });
};

/**
 * Upload check-in photo with a fast local/dev fallback.
 *
 * In local emulator mode Storage is usually not running, so waiting for Firebase
 * Storage blocks check-in. For that case, and for slow uploads, keep a compressed
 * data URL in Firestore so the check-in can finish immediately.
 */
export const uploadCheckInPhotoFromDataUrl = async (
    staffId: string,
    photoDataUrl: string,
    type: 'checkin' | 'checkout'
): Promise<string> => {
    const compressedDataUrl = await compressPhotoDataUrl(photoDataUrl);

    if (shouldSkipStorageUpload()) {
        return compressedDataUrl;
    }

    try {
        const blob = dataURLtoBlob(compressedDataUrl);
        return await withTimeout(
            uploadCheckInPhoto(staffId, blob, type),
            getUploadTimeoutMs()
        );
    } catch (error) {
        console.warn('[check-in] Photo upload failed, using compressed Firestore fallback:', error);
        return compressedDataUrl;
    }
};

/**
 * Convert base64 data URL to Blob
 */
export const dataURLtoBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};
