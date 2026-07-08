/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject, getMetadata } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase using the provisioned app configurations safely
let app: any;
let db: any = null;
let auth: any = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.warn('Firestore already initialized, retrieving existing instance:', error);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  
  auth = getAuth(app);
} catch (error) {
  console.error('Failed to initialize Firebase completely:', error);
}


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function isPermissionError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return error.code === 'permission-denied' || msg.includes('permission') || msg.includes('insufficient');
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Warn: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Interface representing the complete serialized system state for cloud backup and recovery.
 */
export interface SystemStatePayload {
  users: any[];
  courses: any[];
  classes: any[];
  subjects: any[];
  grades: any[];
  attendance: any[];
  conceptRanges: any[];
  calendarEvents: any[];
  messages: any[];
  notifications: any[];
  currentPeriod: string;
  periods: string[];
  simulatedDate: string;
  autoLockEnabled: boolean;
  securityLogs: any[];
  declarationConfigs?: any;
  studentDocuments?: any[];
  lastBackupTime?: string;
  version?: string;
}

/**
 * Saves the complete portal state to Cloud Firestore.
 */
export async function saveStateToCloud(state: SystemStatePayload): Promise<boolean> {
  const path = 'academic_portal/state_node';
  if (!db) {
    console.warn('Firestore is not initialized. saveStateToCloud deferred (operating in offline-only mode).');
    return false;
  }
  try {
    const stateDocRef = doc(db, 'academic_portal', 'state_node');
    const cleanedState = JSON.parse(JSON.stringify(state));
    await setDoc(stateDocRef, {
      ...cleanedState,
      lastBackupTime: new Date().toISOString(),
      version: '1.0.0-cloud-sync'
    }, { merge: true });
    return true;
  } catch (error: any) {
    console.error('Firestore write failed:', error?.message || error);
    return false;
  }
}

/**
 * Loads the complete portal state from Cloud Firestore. Returns null if database is empty,
 * or { isOffline: true } if network/offline issues prevent connecting to Firestore.
 */
export async function loadStateFromCloud(): Promise<SystemStatePayload | null | { isOffline: boolean }> {
  if (!db) {
    console.warn('Firestore is not initialized. loadStateFromCloud operating in offline mode.');
    return { isOffline: true };
  }
  try {
    const stateDocRef = doc(db, 'academic_portal', 'state_node');
    const docSnap = await getDoc(stateDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as SystemStatePayload;
    }
    return null;
  } catch (error: any) {
    console.error('Firestore read failed:', error?.message || error);
    return { isOffline: true };
  }
}

let storage: any = null;
try {
  if (app) {
    storage = getStorage(app);
  }
} catch (error) {
  console.error('Failed to initialize Firebase Storage:', error);
}

/**
 * Uploads the serialized state as a JSON file to Firebase Storage.
 */
export async function uploadBackupToStorage(state: SystemStatePayload, filename: string): Promise<string | null> {
  if (!storage) {
    console.warn('Firebase Storage is not initialized.');
    return null;
  }
  try {
    const backupRef = ref(storage, `backups/${filename}`);
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    await uploadBytes(backupRef, blob);
    const url = await getDownloadURL(backupRef);
    return url;
  } catch (error) {
    console.error('Error uploading backup to Firebase Storage:', error);
    return null;
  }
}

/**
 * Lists all backups saved in Firebase Storage.
 */
export interface StorageBackupFile {
  name: string;
  timeCreated: string;
  url: string;
  size: number;
}

export async function listBackupsFromStorage(): Promise<StorageBackupFile[]> {
  if (!storage) {
    console.warn('Firebase Storage is not initialized.');
    return [];
  }
  try {
    const listRef = ref(storage, 'backups/');
    const res = await listAll(listRef);
    const files: StorageBackupFile[] = [];
    
    for (const item of res.items) {
      try {
        const url = await getDownloadURL(item);
        const metadata = await getMetadata(item);
        files.push({
          name: item.name,
          timeCreated: metadata.timeCreated || new Date().toISOString(),
          url,
          size: metadata.size || 0,
        });
      } catch (err) {
        console.warn(`Failed to fetch metadata for backup item ${item.name}:`, err);
      }
    }
    
    return files.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
  } catch (error) {
    console.error('Error listing backups from Firebase Storage:', error);
    return [];
  }
}

/**
 * Deletes a backup from Firebase Storage.
 */
export async function deleteBackupFromStorage(filename: string): Promise<boolean> {
  if (!storage) {
    console.warn('Firebase Storage is not initialized.');
    return false;
  }
  try {
    const backupRef = ref(storage, `backups/${filename}`);
    await deleteObject(backupRef);
    return true;
  } catch (error) {
    console.error(`Error deleting backup ${filename} from Storage:`, error);
    return false;
  }
}

export { db, storage, auth };
