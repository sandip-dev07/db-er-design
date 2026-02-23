export interface IStorage {
  // No storage methods needed as the app uses localStorage only
}

export class MemStorage implements IStorage {
}

export const storage = new MemStorage();
