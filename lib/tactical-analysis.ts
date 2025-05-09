interface TacticalData {
  matchFootage: MatchFootage[];
  playbooks: Playbook[];
  opponentReports: OpponentReport[];
  liveAnalytics: LiveAnalytic[];
}

interface MatchFootage {
  id: string;
  url: string;
  date: string;
  title: string;
  duration: number;
  tags: string[];
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  formation: string;
  tactics: string[];
  createdAt: string;
  updatedAt: string;
}

interface OpponentReport {
  id: string;
  teamName: string;
  matchDate: string;
  strengths: string[];
  weaknesses: string[];
  keyPlayers: string[];
  notes: string;
}

interface LiveAnalytic {
  id: string;
  matchId: string;
  timestamp: string;
  event: string;
  data: Record<string, unknown>;
}

export class TacticalAnalysis {
  static STORAGE_KEY = 'ams-tactical-analysis';

  static saveTacticalData(data: TacticalData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving tactical data:', error);
    }
  }

  static getTacticalData(): TacticalData {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return {
          matchFootage: [],
          playbooks: [],
          opponentReports: [],
          liveAnalytics: []
        };
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error retrieving tactical data:', error);
      return {
        matchFootage: [],
        playbooks: [],
        opponentReports: [],
        liveAnalytics: []
      };
    }
  }

  static addMatchFootage(footage: Omit<MatchFootage, 'id'>): void {
    const data = this.getTacticalData();
    const newFootage: MatchFootage = {
      ...footage,
      id: crypto.randomUUID()
    };
    data.matchFootage.push(newFootage);
    this.saveTacticalData(data);
  }

  static addPlaybook(playbook: Omit<Playbook, 'id' | 'createdAt' | 'updatedAt'>): void {
    const data = this.getTacticalData();
    const newPlaybook: Playbook = {
      ...playbook,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.playbooks.push(newPlaybook);
    this.saveTacticalData(data);
  }

  static addOpponentReport(report: Omit<OpponentReport, 'id'>): void {
    const data = this.getTacticalData();
    const newReport: OpponentReport = {
      ...report,
      id: crypto.randomUUID()
    };
    data.opponentReports.push(newReport);
    this.saveTacticalData(data);
  }

  static addLiveAnalytic(analytic: Omit<LiveAnalytic, 'id' | 'timestamp'>): void {
    const data = this.getTacticalData();
    const newAnalytic: LiveAnalytic = {
      ...analytic,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    data.liveAnalytics.push(newAnalytic);
    this.saveTacticalData(data);
  }

  static clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
