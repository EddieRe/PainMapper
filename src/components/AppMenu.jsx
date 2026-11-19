import { useEffect, useId, useRef, useState } from 'react'
import { MoreIcon } from './icons'

/*
 * The header's "•••" menu (WAI-ARIA menu button). Arrow keys move between
 * items, Home/End jump, Escape closes and returns focus to the button, and a
 * click outside closes it.
 *
 * items: [{ id, label, hint?, disabled?, onSelect, onIntent? } | { separator: true }]
 * (onIntent: the pointer reached the item, so it may be chosen next. Not
 * called for keyboard focus: opening the menu focuses its first enabled
 * item, which is no sign of intent.)
 *
 * mark: { kind: 'busy' | 'alert', text } puts a small mark on the button
 * (something chosen from the menu is in progress, or needs attention) and
 * adds its text to the button's name.
 */
export default function AppMenu({ items, mark = null, label = 'More options', iconSize = 22 }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()

  function menuItems() {
    return [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') ?? [])]
  }

  function close({ returnFocus = true } = {}) {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined

    menuItems()[0]?.focus()

    function handlePointerDown(event) {
      if (
        !menuRef.current?.contains(event.target)
        && !buttonRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function handleMenuKeyDown(event) {
    const list = menuItems()
    const index = list.indexOf(document.activeElement)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        list[(index + 1) % list.length]?.focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        list[(index - 1 + list.length) % list.length]?.focus()
        break
      case 'Home':
        event.preventDefault()
        list[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        list[list.length - 1]?.focus()
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
      case 'Tab':
        close({ returnFocus: false })
        break
      default:
        break
    }
  }

  return (
    <div className="app-menu">
      <button
        ref={buttonRef}
        type="button"
        className="header-icon-button"
        aria-label={mark ? `${label}. ${mark.text}` : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        <MoreIcon size={iconSize} />
        {mark && (
          <span
            className="menu-mark"
            data-mark={mark.kind}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="menu-popup"
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (item.separator ? (
            <div
              key={`separator-${index}`}
              className="menu-separator"
              role="separator"
            />
          ) : (
            <button
              key={item.id}
              type="button"
              className="menu-item"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled ? true : undefined}
              onPointerEnter={item.disabled ? undefined : item.onIntent}
              onClick={() => {
                if (item.disabled) return

                // Focus goes back to the "•••" button first, so whatever the
                // item opens (the About dialog) returns focus there when it
                // closes; actions that move focus elsewhere still can.
                setOpen(false)
                buttonRef.current?.focus()
                item.onSelect()
              }}
            >
              <span className="menu-item-label">{item.label}</span>
              {item.hint && <span className="menu-item-hint">{item.hint}</span>}
            </button>
          )))}
        </div>
      )}
    </div>
  )
}
