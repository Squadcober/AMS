import { saveAs } from 'file-saver';

interface PlayerPosition {
  playerId: string;
  top: string;
  left: string;
}

interface GamePlan {
  id: string;
  name: string;
  size: string;
  gk: boolean;
  positions: {
    [key: string]: PlayerPosition | null;
  };
  strategy: string;
  coachId: string;
}

interface FormattedPlayer {
  name: string;
  position: string;
  x: number;
  y: number;
}

const formatGamePlanForExport = (gamePlan: GamePlan, players: any[]) => {
  const formattedPlayers: FormattedPlayer[] = [];
  
  Object.entries(gamePlan.positions).forEach(([positionName, position]) => {
    if (position) {
      const player = players.find(p => p.id.toString() === position.playerId);
      if (player) {
        // Convert position percentages to numbers
        const x = parseInt(position.left);
        const y = parseInt(position.top);
        
        formattedPlayers.push({
          name: player.name || 'Unknown Player',
          position: positionName,
          x,
          y
        });
      }
    }
  });

  return {
    name: gamePlan.name,
    formation: `${gamePlan.size}-a-side${gamePlan.gk ? ' with GK' : ''}`,
    players: formattedPlayers,
    tactics: gamePlan.strategy,
    createdAt: new Date().toISOString()
  };
};

export const exportToDoc = (gamePlan: GamePlan, players: any[]) => {
  const formattedGamePlan = formatGamePlanForExport(gamePlan, players);
  
  const content = `
    TEAM GAME PLAN
    ==============
    
    Name: ${formattedGamePlan.name}
    Formation: ${formattedGamePlan.formation}
    Created: ${new Date(formattedGamePlan.createdAt).toLocaleDateString()}
    
    PLAYER POSITIONS
    ===============
    ${formattedGamePlan.players.map(player => `
    ${player.name}
    Position: ${player.position}
    Field Position: X: ${Math.round(player.x)}%, Y: ${Math.round(player.y)}%
    `).join('\n')}
    
    TACTICAL NOTES
    =============
    ${formattedGamePlan.tactics || 'No tactical notes provided'}
  `.trim();

  const blob = new Blob([content], { type: 'application/msword' });
  const fileName = `${formattedGamePlan.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
  saveAs(blob, fileName);
};

export const exportMultipleToDoc = (gamePlans: GamePlan[], players: any[]) => {
  const formattedGamePlans = gamePlans.map(plan => formatGamePlanForExport(plan, players));
  
  const content = formattedGamePlans.map(plan => `
    TEAM GAME PLAN: ${plan.name}
    =============================
    
    Formation: ${plan.formation}
    Created: ${new Date(plan.createdAt).toLocaleDateString()}
    
    PLAYER POSITIONS
    ===============
    ${plan.players.map(player => `
    ${player.name}
    Position: ${player.position}
    Field Position: X: ${Math.round(player.x)}%, Y: ${Math.round(player.y)}%
    `).join('\n')}
    
    TACTICAL NOTES
    =============
    ${plan.tactics || 'No tactical notes provided'}
    
    =============================
  `).join('\n\n');

  const blob = new Blob([content], { type: 'application/msword' });
  const fileName = `team_game_plans_${new Date().toISOString().split('T')[0]}.doc`;
  saveAs(blob, fileName);
};
