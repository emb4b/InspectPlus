import { useLocalSearchParams } from 'expo-router';
import { EstablishmentDetailScreen } from '../../../features/establishments/components/EstablishmentDetailScreen';

export default function EstablishmentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <EstablishmentDetailScreen estabId={id} />;
}
