import { useSkinMenu } from '../viewer/skinChoice'
import AppMenu from './AppMenu'
import { HelpIcon, PinIcon, SearchIcon } from './icons'

/*
 * The compact header: the PainMapper mark, About (wide screens), a search
 * button when the phone search bar is tucked away, and the "•••" menu with
 * Start new case / Clear location / Clear case details / the skin (Gray or
 * Original) / About.
 *
 * The menu's { slot: 'skin' } entry is filled in here, so a change of skin
 * re-renders the header only. While an Original asked for from the menu is
 * being prepared, or has failed, the menu button carries a small mark (the
 * corner Skin control, which would show it, may not be on screen).
 */
export default function AppHeader({
  layout,
  menuItems,
  showSearchButton,
  inert = false,
  onSearch,
  onOpenAbout,
}) {
  const wide = layout === 'wide'
  const skin = useSkinMenu()
  const items = menuItems.flatMap((item) => (item.slot === 'skin' ? skin.items : [item]))

  return (
    <header
      className={`app-header app-header-${layout}`}
      inert={inert}
    >
      <div className="brand">
        <span
          className="brand-mark"
          aria-hidden="true"
        >
          <PinIcon size={wide ? 22 : 20} />
        </span>

        <h1 className="brand-name">PainMapper</h1>

        {wide && (
          <>
            <span
              className="brand-divider"
              aria-hidden="true"
            />
            <p className="brand-tagline">Musculoskeletal learning</p>
          </>
        )}
      </div>

      <div className="header-actions">
        {showSearchButton && (
          <button
            type="button"
            className="header-icon-button"
            aria-label="Find a body location"
            onClick={onSearch}
          >
            <SearchIcon size={22} />
          </button>
        )}

        {wide && (
          <button
            type="button"
            className="header-link"
            onClick={() => onOpenAbout('purpose')}
          >
            <HelpIcon size={20} />
            About
          </button>
        )}

        <AppMenu
          items={items}
          mark={skin.mark}
          iconSize={wide ? 26 : 22}
        />
      </div>
    </header>
  )
}
