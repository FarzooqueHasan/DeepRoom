import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  documentId,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

// Local storage key prefix for offline/local simulation
const LOCAL_PREFIX = 'deeproom_db_';

class LocalEntityStore {
  constructor(collectionName) {
    this.name = collectionName;
    this.key = `${LOCAL_PREFIX}${collectionName}`;
    this.subscribers = new Set();
  }

  _getItems() {
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveItems(items) {
    try {
      localStorage.setItem(this.key, JSON.stringify(items));
    } catch (err) {
      console.warn(`[LocalStore ${this.name}] save failed:`, err);
    }
  }

  notify(event) {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error(`[LocalStore ${this.name}] subscriber error:`, err);
      }
    });
  }

  async list() {
    return this._getItems();
  }

  async filter(filterObj = {}, orderField = null, limitCount = null) {
    let items = this._getItems();
    if (filterObj && typeof filterObj === 'object') {
      items = items.filter((item) => {
        return Object.entries(filterObj).every(([k, v]) => {
          if (v === undefined || v === null) return true;
          return item[k] === v;
        });
      });
    }

    if (orderField) {
      const isDesc = orderField.startsWith('-');
      const field = isDesc ? orderField.substring(1) : orderField;
      items.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    if (limitCount && limitCount > 0) {
      items = items.slice(0, limitCount);
    }
    return items;
  }

  async get(id) {
    const items = this._getItems();
    return items.find((item) => item.id === id) || null;
  }

  async create(data) {
    const items = this._getItems();
    const id = data.id || 'id_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id,
      created_date: data.created_date || now,
      updated_date: now,
    };
    items.push(newItem);
    this._saveItems(items);
    this.notify({ type: 'create', data: newItem });
    return newItem;
  }

  async bulkCreate(itemsList) {
    const results = [];
    for (const item of itemsList) {
      const created = await this.create(item);
      results.push(created);
    }
    return results;
  }

  async update(id, updates) {
    const items = this._getItems();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      // Auto-create if not exists
      return this.create({ ...updates, id });
    }
    const previous = { ...items[index] };
    const updated = {
      ...previous,
      ...updates,
      id,
      updated_date: new Date().toISOString(),
    };
    items[index] = updated;
    this._saveItems(items);
    this.notify({ type: 'update', data: updated, previous });
    return updated;
  }

  async delete(id) {
    let items = this._getItems();
    const target = items.find((item) => item.id === id);
    items = items.filter((item) => item.id !== id);
    this._saveItems(items);
    if (target) {
      this.notify({ type: 'delete', data: target });
    }
    return true;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
}

// Firestore Entity Handler
class FirestoreEntityStore {
  constructor(collectionName) {
    this.name = collectionName;
  }

  _col() {
    return collection(db, this.name);
  }

  async list() {
    const snap = await getDocs(this._col());
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }

  async filter(filterObj = {}, orderField = null, limitCount = null) {
    // Fast path: direct lookup by document ID
    if (filterObj && filterObj.id && Object.keys(filterObj).length === 1) {
      const single = await this.get(filterObj.id);
      return single ? [single] : [];
    }

    const clauses = [];
    if (filterObj && typeof filterObj === 'object') {
      Object.entries(filterObj).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (k === 'id') {
            clauses.push(where(documentId(), '==', v));
          } else {
            clauses.push(where(k, '==', v));
          }
        }
      });
    }

    if (orderField) {
      const isDesc = orderField.startsWith('-');
      const field = isDesc ? orderField.substring(1) : orderField;
      clauses.push(orderBy(field, isDesc ? 'desc' : 'asc'));
    }

    if (limitCount && limitCount > 0) {
      clauses.push(limit(limitCount));
    }

    const q = clauses.length > 0 ? query(this._col(), ...clauses) : this._col();
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  }

  async get(id) {
    if (!id) return null;
    const docRef = doc(db, this.name, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  async create(data) {
    const now = new Date().toISOString();
    let docRef;
    if (data.id) {
      docRef = doc(db, this.name, data.id);
    } else {
      docRef = doc(this._col());
    }
    const id = docRef.id;
    const record = {
      ...data,
      id,
      created_date: data.created_date || now,
      updated_date: now,
    };

    await setDoc(docRef, record);
    return record;
  }

  async bulkCreate(itemsList) {
    const results = [];
    for (const item of itemsList) {
      const created = await this.create(item);
      results.push(created);
    }
    return results;
  }

  async update(id, updates) {
    const docRef = doc(db, this.name, id);
    const updatedRecord = {
      ...updates,
      updated_date: new Date().toISOString(),
    };
    await updateDoc(docRef, updatedRecord);
    return { id, ...updatedRecord };
  }

  async delete(id) {
    const docRef = doc(db, this.name, id);
    await deleteDoc(docRef);
    return true;
  }

  subscribe(callback) {
    return onSnapshot(
      this._col(),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const itemData = { id: change.doc.id, ...change.doc.data() };
          callback({
            type: change.type === 'added' ? 'create' : change.type === 'modified' ? 'update' : 'delete',
            data: itemData,
          });
        });
      },
      (err) => {
        console.warn(`[DeepRoom Firestore ${this.name}] Realtime listener error:`, err?.message || err);
      }
    );
  }
}

// Entity Factory
const localStores = new Map();
const firestoreStores = new Map();

export const getEntityStore = (collectionName) => {
  if (isFirebaseConfigured && db) {
    if (!firestoreStores.has(collectionName)) {
      firestoreStores.set(collectionName, new FirestoreEntityStore(collectionName));
    }
    return firestoreStores.get(collectionName);
  }

  if (!localStores.has(collectionName)) {
    localStores.set(collectionName, new LocalEntityStore(collectionName));
  }
  return localStores.get(collectionName);
};

// Automatic local-to-cloud sync for orphaned rooms created while offline or before login
export const syncLocalToFirestore = async (user) => {
  if (!isFirebaseConfigured || !db || !user?.id) return;
  try {
    const rawLocalRooms = localStorage.getItem('deeproom_db_Room');
    if (rawLocalRooms) {
      const localRooms = JSON.parse(rawLocalRooms);
      if (Array.isArray(localRooms) && localRooms.length > 0) {
        const roomStore = getEntityStore('Room');
        for (const r of localRooms) {
          if (!r.name) continue;
          // Check if already exists in Firestore by ID or invite code
          let exists = false;
          if (r.id) {
            const found = await roomStore.get(r.id);
            if (found) exists = true;
          }
          if (!exists && r.invite_code) {
            const byCode = await roomStore.filter({ invite_code: r.invite_code });
            if (byCode.length > 0) exists = true;
          }
          if (!exists) {
            await roomStore.create({
              ...r,
              host_id: user.id,
              host_email: user.email || r.host_email,
              members: [user.id],
              member_emails: user.email ? [user.email.toLowerCase()] : [],
            });
            console.info(`[DeepRoom Sync] Synced local room "${r.name}" to Firestore.`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[DeepRoom Sync] Warning syncing local rooms to Firestore:', err);
  }
};

