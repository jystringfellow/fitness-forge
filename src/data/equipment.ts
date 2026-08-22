import { EquipmentId } from '@/types/workout';

export interface EquipmentOption {
  id: EquipmentId;
  name: string;
  availableLoadsLb?: number[];
  adjustable?: boolean;
}

export const DEFAULT_EQUIPMENT: EquipmentOption[] = [
  { id: 'bodyweight', name: 'Bodyweight' },
  { id: 'pull-up-bar', name: 'Pull-up Bar' },
  { id: 'functional-trainer', name: 'Functional Trainer', adjustable: true },
  { id: 'cable', name: 'Cable Resistance', adjustable: true },
  { id: 'dumbbells', name: 'Dumbbells', availableLoadsLb: [5, 10, 15, 20], adjustable: true },
  { id: 'kettlebell', name: 'Kettlebell', availableLoadsLb: [25] },
  { id: 'medicine-ball', name: 'Medicine Ball', availableLoadsLb: [25] },
  { id: 'step-platform', name: 'Step / Platform' }
];
