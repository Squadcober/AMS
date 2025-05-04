export class DrillManager {
  private drills: any[] = [];
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
    if (this.isClient) {
      const savedDrills = localStorage.getItem("coach-drills");
      if (savedDrills) {
        try {
          this.drills = JSON.parse(savedDrills);
        } catch (error) {
          console.error('Error parsing saved drills:', error);
          this.drills = [];
        }
      }
    }
  }

  getDrills() {
    return this.drills;
  }

  saveDrills(drills: any[]) {
    if (this.isClient) {
      try {
        localStorage.setItem("coach-drills", JSON.stringify(drills));
        this.drills = drills;
      } catch (error) {
        console.error('Error saving drills:', error);
      }
    }
  }
}

// Create a singleton instance
export const DrillManagerInstance = new DrillManager();