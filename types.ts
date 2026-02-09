
export enum ServiceStatus {
  COMPLETED = 'Concluído',
  IN_PROGRESS = 'Em Andamento',
  PENDING_REVIEW = 'Revisão Pendente',
  ACTION_REQUIRED = 'Ação Necessária',
}

export enum ServiceType {
  DISINSECTIZATION = 'Desinsetização',
  DERATIZATION = 'Desratização',
  TERMITE_CONTROL = 'Controle de Cupins',
}

export interface Evaluation {
  id: string;
  date: string;
  unit: string;
  location: string;
  type: ServiceType;
  score: number;
  status: ServiceStatus;
}

export interface UserProfile {
  uid: string;
  name: string;
  unit: string;
  role: 'Titular' | 'Substituto';
  email: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
