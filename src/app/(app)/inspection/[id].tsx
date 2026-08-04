import { useLocalSearchParams } from 'expo-router';
import { InspectionReportDetailScreen } from '../../../features/inspections/components/InspectionReportDetailScreen';

export default function InspectionReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InspectionReportDetailScreen reportId={id} />;
}
