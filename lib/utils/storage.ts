export class StorageUtils {
  static getItem<T = unknown>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) as T : null;
    } catch (error) {
      console.error(`Error getting item ${key} from storage:`, error);
      return null;
    }
  }

  static setItem<T = unknown>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in storage:`, error);
    }
  }

  static getChunkedData<T = unknown>(baseKey: string): T[] {
    try {
      const chunkCount = parseInt(localStorage.getItem(`${baseKey}_count`) || "0");
      let allData: T[] = [];
      
      for (let i = 0; i < chunkCount; i++) {
        const chunk = StorageUtils.getItem<T[]>(`${baseKey}_${i}`);
        if (chunk) allData = [...allData, ...chunk];
      }

      return allData;
    } catch (error) {
      console.error('Error loading chunked data:', error);
      return [];
    }
  }

  static setChunkedData<T = unknown>(baseKey: string, data: T[], chunkSize: number = 50): void {
    try {
      // Clear existing chunks
      const existingCount = parseInt(localStorage.getItem(`${baseKey}_count`) || "0");
      for (let i = 0; i < existingCount; i++) {
        localStorage.removeItem(`${baseKey}_${i}`);
      }

      // Split data into chunks and save
      const chunks: T[][] = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }

      chunks.forEach((chunk, index) => {
        StorageUtils.setItem(`${baseKey}_${index}`, chunk);
      });

      localStorage.setItem(`${baseKey}_count`, chunks.length.toString());
    } catch (error) {
      console.error('Error saving chunked data:', error);
    }
  }
}
