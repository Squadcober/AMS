import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
}

export function TrainingModal({ isOpen, onClose, date }: TrainingModalProps) {
  const [training, setTraining] = useState<any>(null);

  useEffect(() => {
    // In a real application, you would fetch the training data for the selected date
    // For now, we'll use mock data
    setTraining({
      type: 'Speed and Agility',
      duration: '1.5 hours',
      description: 'Focus on improving acceleration and change of direction.',
      exercises: [
        'Ladder drills - 15 minutes',
        'Cone sprints - 20 minutes',
        'Shuttle runs - 15 minutes',
        'Plyometric exercises - 20 minutes',
        'Cool down and stretching - 20 minutes'
      ]
    });
  }, [date]);

  if (!training) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Training for {date.toDateString()}</DialogTitle>
          <DialogDescription>
            {training.type} - {training.duration}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <p className="mb-2">{training.description}</p>
          <h4 className="font-semibold mb-2">Exercises:</h4>
          <ul className="list-disc pl-5">
            {training.exercises.map((exercise: string, index: number) => (
              <li key={index}>{exercise}</li>
            ))}
          </ul>
        </div>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </DialogContent>
    </Dialog>
  );
}

