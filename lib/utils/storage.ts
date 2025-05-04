export class StorageUtils {
  static getItem(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key} from storage:`, error);
      return null;
    }
  }

  static setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in storage:`, error);
    }
  }

  static getChunkedData(baseKey: string): any[] {
    try {
      const chunkCount = parseInt(localStorage.getItem(`${baseKey}_count`) || "0");
      let allData: any[] = [];
      
      for (let i = 0; i < chunkCount; i++) {
        const chunk = StorageUtils.getItem(`${baseKey}_${i}`);
        if (chunk) allData = [...allData, ...chunk];
      }

      return allData;
    } catch (error) {
      console.error('Error loading chunked data:', error);
      return [];
    }
  }

  static setChunkedData(baseKey: string, data: any[], chunkSize: number = 50): void {
    try {
      // Clear existing chunks
      const existingCount = parseInt(localStorage.getItem(`${baseKey}_count`) || "0");
      for (let i = 0; i < existingCount; i++) {
        localStorage.removeItem(`${baseKey}_${i}`);
      }

      // Split data into chunks and save
      const chunks = [];
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
