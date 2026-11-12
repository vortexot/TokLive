import { useEffect } from 'react';
import { Link, useLocation, useMatch } from 'react-router-dom';
import { Bell, ChevronRight, CircleHelp, CircleUser, FlaskConical, Menu, Settings } from 'lucide-react';
import { getGame } from '../../domain/games';
import type { GameId } from '../../domain/types';
import { formatNumber, timeAgo } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import { NOTIFIABLE, unreadNotifications } from '../../state/engine';
import { useActions } from '../../state/AppProvider';
import { useAppState } from '../../state/store';
import { Button } from '../ui/Button';
import { ActivityIcon } from '../ui/ActivityIcon';
import { Popover } from '../ui/Popover';
import { ConnectionPill } from './ConnectionPill';
import { getPageMeta } from './nav';

function NotificationsMenu() {
  const actions = useActions();
  const now = useNow(20_000);
  const unread = useAppState((s) => unreadNotifications(s), Object.is);
  const items = useAppState((s) => s.activity.filter((a) => NOTIFIABLE.includes(a.kind)).slice(0, 8), (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i]?.id && x.at === b[i]?.at));
  return (
    <Popover
      onToggle={(open) => {
        if (open) actions.markNotificationsRead();
      }}
      trigger={({ open, toggle, ref, id }) => (
        <button
          ref={ref}
          type="button"
          className="icon-btn"
          aria-label={unread ? `Notificações: ${unread} novas` : 'Notificações'}
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={toggle}
        >
          <Bell size={19} aria-hidden />
          {unread ? (
            <span className="icon-btn__badge" aria-hidden>
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      )}
    >
      {() => (
        <div className="notif">
          <p className="notif__head">Notificações</p>
          {items.length === 0 ? (
            <p className="notif__empty">Nada novo por aqui. Os eventos da LIVE aparecem nesta lista.</p>
          ) : (
            <ul className="notif__list">
              {items.map((item) => (
                <li key={item.id} className="notif__item">
                  <span className="notif__icon">
                    <ActivityIcon kind={item.kind} />
                  </span>
                  <span className="notif__text">
                    <span className="notif__title">{item.title}</span>
                    {item.detail ? <span className="notif__detail">{item.detail}</span> : null}
                  </span>
                  <time className="notif__time" dateTime={new Date(item.at).toISOString()}>
                    {timeAgo(now, item.at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

function AccountMenu() {
  const profile = useAppState((s) => s.settings.profile);
  const actions = useActions();
  const initials = profile.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <Popover
      trigger={({ open, toggle, ref, id }) => (
        <button ref={ref} type="button" className="user-btn" aria-label="Menu da conta" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}>
          <span className="user-badge" aria-hidden>
            {initials || 'TA'}
          </span>
        </button>
      )}
    >
      {(close) => (
        <div className="account-menu">
          <div className="account-menu__who">
            <p className="account-menu__name">{profile.displayName}</p>
            <p className="account-menu__mail">{profile.email}</p>
          </div>
          <div className="menu-sep" />
          <Link className="menu-item" to="/conta" onClick={close}>
            <CircleUser size={17} aria-hidden /> Conta
          </Link>
          <Link className="menu-item" to="/configuracoes" onClick={close}>
            <Settings size={17} aria-hidden /> Configurações gerais
          </Link>
          <Link className="menu-item" to="/ajuda" onClick={close}>
            <CircleHelp size={17} aria-hidden /> Ajuda
          </Link>
          <div className="menu-sep" />
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              close();
              actions.setSimulator({ open: true });
            }}
          >
            <FlaskConical size={17} aria-hidden /> Abrir simulador
          </button>
        </div>
      )}
    </Popover>
  );
}

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const actions = useActions();
  const { pathname } = useLocation();
  const gameMatch = useMatch('/game-hub/:gameId');
  const gameId = gameMatch?.params.gameId as GameId | undefined;
  const gameName = gameId ? (() => { try { return getGame(gameId).name; } catch { return undefined; } })() : undefined;
  const { title, crumbs } = getPageMeta(pathname, gameName);
  const { showDemoTools, simOpen } = useAppState((s) => ({ showDemoTools: s.settings.showDemoTools, simOpen: s.simulator.open }));
  const participants = useAppState((s) => s.participants.length, Object.is);

  useEffect(() => {
    document.title = `${title} · TokArena`;
  }, [title]);

  return (
    <header className="header">
      <Button className="header__menu" variant="ghost" iconOnly icon={Menu} aria-label="Abrir menu de navegação" onClick={onOpenMenu} />
      <div className="header__titles">
        {crumbs.length ? (
          <nav aria-label="Você está em" className="crumbs">
            <ol>
              {crumbs.map((c, i) => (
                <li key={c.label}>
                  {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                  {i < crumbs.length - 1 ? <ChevronRight size={13} aria-hidden /> : null}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="header__title">{title}</h1>
      </div>

      <div className="header__tools">
        <span className="header__count" aria-label={`${formatNumber(participants)} participantes`}>
          <span className="score">{formatNumber(participants)}</span> participantes
        </span>
        <ConnectionPill />
        {showDemoTools ? (
          <Button
            variant={simOpen ? 'primary' : 'secondary'}
            size="sm"
            icon={FlaskConical}
            aria-pressed={simOpen}
            aria-label="Simulador de eventos"
            onClick={() => actions.setSimulator({ open: !simOpen })}
            className="header__sim"
          >
            <span className="header__sim-text">Simulador</span>
          </Button>
        ) : null}
        <NotificationsMenu />
        <AccountMenu />
      </div>
    </header>
  );
}
