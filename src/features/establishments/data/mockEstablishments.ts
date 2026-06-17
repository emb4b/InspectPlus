export type ComplianceTag =
  | 'Air Monitoring'
  | 'Water Monitoring'
  | 'Hazwaste'
  | 'Survey'
  | 'EIA';

export interface MockEstablishment {
  id: string;
  name: string;
  location: string;
  province: string;
  tags: ComplianceTag[];
}

export const MOCK_ESTABLISHMENTS: MockEstablishment[] = [
  {
    id: '1',
    name: 'Calapan Industrial Park',
    location: 'Calapan City, Oriental Mindoro',
    province: 'Oriental Mindoro',
    tags: ['Air Monitoring', 'Water Monitoring', 'Hazwaste'],
  },
  {
    id: '2',
    name: 'Puerto Princesa Resort Corp.',
    location: 'Puerto Princesa, Palawan',
    province: 'Palawan',
    tags: ['Survey', 'Hazwaste', 'Water Monitoring'],
  },
  {
    id: '3',
    name: 'Puerto Galera Seaview Resort',
    location: 'Puerto Galera, Oriental Mindoro',
    province: 'Oriental Mindoro',
    tags: ['Survey', 'Air Monitoring'],
  },
  {
    id: '4',
    name: 'Coron Beach Resort',
    location: 'Coron, Palawan',
    province: 'Palawan',
    tags: ['Survey', 'Water Monitoring'],
  },
  {
    id: '5',
    name: 'BDO Unibank, Inc. – BDO Mindoro Branch',
    location: 'Calapan City, Oriental Mindoro',
    province: 'Oriental Mindoro',
    tags: ['Survey', 'Hazwaste', 'Water Monitoring'],
  },
  {
    id: '6',
    name: 'Oriental Mindoro Electric Cooperative',
    location: 'Calapan City, Oriental Mindoro',
    province: 'Oriental Mindoro',
    tags: ['Air Monitoring', 'EIA'],
  },
  {
    id: '7',
    name: 'Palawan Coconut Products Inc.',
    location: 'Puerto Princesa, Palawan',
    province: 'Palawan',
    tags: ['Water Monitoring', 'Hazwaste', 'EIA'],
  },
];
