import { NavLink } from 'react-router-dom';

/**
 * Abas do Palco. São links, porque cada aba tem endereço próprio. O link ativo recebe aria-current="page"
 * do próprio NavLink, e o CSS usa isso para desenhar a aba selecionada como as outras abas do painel.
 */
export function PalcoTabs() {
  return (
    <nav className="tabs palco-tabs" aria-label="Seções do Palco">
      <NavLink to="/palco" end className="tabs__tab">
        Palco
      </NavLink>
      <NavLink to="/palco/bonecos" className="tabs__tab">
        Bonecos
      </NavLink>
    </nav>
  );
}
