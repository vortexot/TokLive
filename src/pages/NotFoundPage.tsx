import { Compass } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';

export default function NotFoundPage() {
  return (
    <EmptyState icon={Compass} title="Página não encontrada" text="O endereço não existe neste painel. Volte para a visão geral e siga pelo menu.">
      <ButtonLink to="/" variant="primary">
        Ir para a visão geral
      </ButtonLink>
    </EmptyState>
  );
}
