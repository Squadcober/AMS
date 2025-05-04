const CHUNK_SIZE = 512 * 1024; // Increase chunk size to 512KB

export const StorageUtils = {
  setItem(key: string, data: any): void {
    try {
      // Convert data to string
      const stringified = JSON.stringify(data);
      
      // Calculate number of chunks needed
      const chunks = Math.ceil(stringified.length / CHUNK_SIZE);
      console.log('Storing data:', { totalSize: stringified.length, chunks });

      // Clear any existing chunks first
      this.removeItem(key);

      // Store the chunk count
      localStorage.setItem(`${key}_count`, chunks.toString());

      // Split and store data in chunks
      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = start + CHUNK_SIZE;
        const chunk = stringified.slice(start, end);
        
        try {
          localStorage.setItem(`${key}_${i}`, chunk);
          console.log(`Chunk ${i} stored successfully`, { size: chunk.length });
        } catch (error) {
          console.error(`Failed to save chunk ${i}:`, error);
          // Clean up on failure
          this.removeItem(key);
          throw new Error(`Storage failed at chunk ${i}`);
        }
      }
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  },

  getItem(key: string): any {
    try {
      // Get the number of chunks
      const chunks = parseInt(localStorage.getItem(`${key}_count`) || "0");
      if (!chunks) return null;

      console.log(`Retrieving ${chunks} chunks for key ${key}`);
      
      // Reconstruct data from chunks
      let stringified = "";
      for (let i = 0; i < chunks; i++) {
        const chunk = localStorage.getItem(`${key}_${i}`);
        if (!chunk) {
          console.error(`Missing chunk ${i} for key ${key}`);
          return null;
        }
        stringified += chunk;
      }

      return JSON.parse(stringified);
    } catch (error) {
      console.error('Retrieval error:', error);
      return null;
    }
  },

  removeItem(key: string): void {
    const chunks = parseInt(localStorage.getItem(`${key}_count`) || "0");
    console.log(`Removing ${chunks} chunks for key ${key}`);
    
    // Remove all chunks
    for (let i = 0; i < chunks; i++) {
      localStorage.removeItem(`${key}_${i}`);
    }
    
    // Remove chunk count
    localStorage.removeItem(`${key}_count`);
    // Remove the main key as well
    localStorage.removeItem(key);
  }
};
