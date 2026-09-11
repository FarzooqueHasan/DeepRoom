import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './config';

export const uploadFile = async (file, folder = 'uploads') => {
  if (isFirebaseConfigured && storage && file) {
    try {
      const fileName = `${Date.now()}_${file.name || 'file'}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { file_url: url };
    } catch (err) {
      console.error('[DeepRoom Storage] Upload failed, falling back to base64:', err);
    }
  }

  // Fallback: convert file to Base64 Data URL
  return new Promise((resolve, reject) => {
    if (!file) {
      return resolve({ file_url: '' });
    }
    if (typeof file === 'string') {
      return resolve({ file_url: file });
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ file_url: reader.result });
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
