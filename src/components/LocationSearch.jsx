import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { searchLocations } from '../data/locationSearch'
import { useKeyboardInset } from '../layout/useLayout'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  SearchIcon,
} from './icons'
import { LocatorThumb } from './MiniLocator'

/*
 * "Find a body location": by the exact anatomical name, a familiar name
 * ("kneecap", "heel"), or a body region ("knee" offers every knee location).
 * With an empty search it lists the locations near the current one, then
 * every location by body region, so all of them stay reachable.
 *
 * A location on both sides of the body asks for the patient's side, unless
 * the search already says it ("left knee").
 *
 * ARIA combobox + grouped listbox. Keyboard: type to search, Up/Down to
 * move, Enter to choose, Escape to step back / close / clear, Tab to leave.
 * Phones show the results over the viewer with a Cancel button; wide
 * screens show them under the search box.
 */

function zonesBySide(entry) {
  const left = entry.zones.find((zone) => zone.side === 'left')
  const right = entry.zones.find((zone) => zone.side === 'right')

  return { left, right, bilateral: Boolean(left && right) }
}

function displayZone(entry) {
  const { right } = zonesBySide(entry)

  return right ?? entry.zones[0]
}

function groupByRegion(entries) {
  const groups = new Map()

  for (const entry of entries) {
    if (!groups.has(entry.region)) groups.set(entry.region, [])
    groups.get(entry.region).push(entry)
  }

  return [...groups.entries()]
}

// Keeps an option visible by scrolling only the list, never the page.
function scrollOptionIntoList(list, option) {
  if (!list || !option) return

  const listBox = list.getBoundingClientRect()
  const optionBox = option.getBoundingClientRect()
  const headingRoom = 34

  if (optionBox.top - headingRoom < listBox.top) {
    list.scrollTop -= listBox.top - optionBox.top + headingRoom
  } else if (optionBox.bottom > listBox.bottom) {
    list.scrollTop += optionBox.bottom - listBox.bottom + 6
  }
}

export default function LocationSearch({
  layout,
  entries,
  index,
  selectedZone,
  spotOptions,
  disabled,
  inputRef: externalInputRef,
  describe,
  onPick,
  onOpenChange,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sideStep, setSideStep] = useState(null)
  const baseId = useId()
  const ownInputRef = useRef(null)
  const inputRef = externalInputRef ?? ownInputRef
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const rightButtonRef = useRef(null)

  const listId = `${baseId}-list`
  const optionId = (position) => `${baseId}-option-${position}`

  const entryByName = useMemo(
    () => new Map(entries.map((entry) => [entry.name, entry])),
    [entries],
  )

  const { sections, side, total, note } = useMemo(() => {
    if (!query.trim()) {
      const list = []

      if (selectedZone) {
        const nearby = spotOptions
          .filter((zone) => zone.id !== selectedZone.id)
          .map((zone) => ({ kind: 'zone', zone, entry: entryByName.get(zone.locationName) }))
          .filter((item) => item.entry)

        if (nearby.length > 0) {
          list.push({ id: 'nearby', title: `Near ${selectedZone.locationName}`, items: nearby })
        }
      }

      for (const [region, regionEntries] of groupByRegion(entries)) {
        list.push({
          id: `region-${region}`,
          title: region,
          items: regionEntries.map((entry) => ({ kind: 'entry', entry })),
        })
      }

      return { sections: list, side: null, total: entries.length }
    }

    if (!index) return { sections: [], side: null, total: 0 }

    const result = searchLocations(index, query)
    const list = result.sections
      .map((section) => ({
        id: section.id,
        title: section.title,
        items: section.items
          .map((item) => ({
            kind: 'entry',
            entry: entryByName.get(item.name),
            matchText: item.matchText,
          }))
          .filter((item) => item.entry),
      }))
      .filter((section) => section.items.length > 0)

    return {
      sections: list,
      side: result.side,
      note: result.note,
      total: list.reduce((sum, section) => sum + section.items.length, 0),
    }
  }, [query, index, entries, entryByName, selectedZone, spotOptions])

  // Every option's position in the whole list (for keyboard navigation and
  // aria-activedescendant), counted once per result set.
  const { options, positions } = useMemo(() => {
    const flat = sections.flatMap((section) => section.items)

    return { options: flat, positions: new Map(flat.map((item, index) => [item, index])) }
  }, [sections])
  const safeActive = options.length === 0 ? -1 : Math.min(activeIndex, options.length - 1)
  const showPanel = open && !disabled

  // Wide layout (also landscape phones): the results card ends above the
  // on-screen keyboard; when that leaves little room, rows get compact.
  const keyboard = useKeyboardInset()
  const cardRef = useRef(null)
  const [cardRoom, setCardRoom] = useState(null)

  useLayoutEffect(() => {
    if (layout !== 'wide' || !showPanel) return undefined

    function fit() {
      const card = cardRef.current

      if (!card) return

      const top = card.getBoundingClientRect().top

      setCardRoom(Math.floor(window.innerHeight - keyboard - top - 12))
    }

    fit()
    window.addEventListener('resize', fit)

    return () => window.removeEventListener('resize', fit)
  }, [layout, showPanel, keyboard])

  const crampedCard = layout === 'wide' && keyboard > 0 && cardRoom !== null && cardRoom < 200
  const cardStyle = layout === 'wide' && keyboard > 0 && cardRoom !== null
    ? { maxHeight: `${Math.max(56, cardRoom)}px` }
    : undefined

  // Reports real changes only, whatever callback the parent passes.
  const reportedOpen = useRef(false)

  useEffect(() => {
    if (reportedOpen.current === showPanel) return

    reportedOpen.current = showPanel
    onOpenChange?.(showPanel)
  }, [showPanel, onOpenChange])

  useEffect(() => {
    if (!showPanel || sideStep || safeActive < 0) return

    scrollOptionIntoList(listRef.current, document.getElementById(optionId(safeActive)))
    // optionId depends on baseId only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPanel, sideStep, safeActive])

  useEffect(() => {
    if (sideStep) rightButtonRef.current?.focus()
  }, [sideStep])

  function reset({ blur = false } = {}) {
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
    setSideStep(null)

    if (blur) inputRef.current?.blur()
  }

  function finish(zone) {
    reset()
    onPick(zone)
  }

  function choose(item) {
    if (!item) return

    if (item.kind === 'zone') {
      finish(item.zone)
      return
    }

    const sides = zonesBySide(item.entry)

    if (sides.bilateral) {
      if (side && sides[side]) {
        finish(sides[side])
        return
      }

      setSideStep({ entry: item.entry })
      return
    }

    finish(item.entry.zones[0])
  }

  function backToResults() {
    setSideStep(null)
    inputRef.current?.focus({ preventScroll: true })
  }

  function handleKeyDown(event) {
    const last = options.length - 1

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()

        if (!open) {
          setOpen(true)
          setActiveIndex(0)
        } else {
          setActiveIndex(Math.min(last, safeActive + 1))
        }

        break

      case 'ArrowUp':
        event.preventDefault()
        setOpen(true)
        setActiveIndex(Math.max(0, safeActive - 1))
        break

      case 'Home':
        if (open && options.length > 0) {
          event.preventDefault()
          setActiveIndex(0)
        }

        break

      case 'End':
        if (open && options.length > 0) {
          event.preventDefault()
          setActiveIndex(last)
        }

        break

      case 'Enter':
        if (open && safeActive >= 0) {
          event.preventDefault()
          choose(options[safeActive])
        }

        break

      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        } else if (query) {
          event.preventDefault()
          setQuery('')
        }

        break

      case 'Tab':
        setOpen(false)
        break

      default:
        break
    }
  }

  function handleSideStepKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      backToResults()
    }
  }

  // Close when focus leaves the whole search (not when it moves inside it).
  function handleBlur(event) {
    if (!containerRef.current?.contains(event.relatedTarget)) {
      setOpen(false)
      setSideStep(null)
    }
  }

  function describeEntry(entry) {
    const text = describe(entry.name)
    const count = entry.conditionCount === 0 ? ' · No conditions linked yet' : ''

    return `${text.description}${count}`
  }

  function faceFor(entry) {
    return describe(entry.name).face === 'back' ? 'back' : 'front'
  }

  const listbox = (
    <ul
      ref={listRef}
      id={listId}
      className="search-list"
      role="listbox"
      aria-label={query.trim() ? `Locations matching ${query.trim()}` : 'Locations by body region'}
    >
      {note && (
        <li
          className="search-note"
          role="presentation"
        >
          {note}
        </li>
      )}

      {options.length === 0 && (
        <li
          className="search-empty"
          role="presentation"
        >
          No locations match “{query.trim()}”. Try a body region such as
          “knee” or “hand”, or an anatomical name.
        </li>
      )}

      {sections.map((section) => (
        <li
          key={section.id}
          role="presentation"
          className="search-section"
        >
          <div
            id={`${baseId}-${section.id}`}
            className="search-section-title"
          >
            {section.title}
          </div>

          <ul
            role="group"
            aria-labelledby={`${baseId}-${section.id}`}
          >
            {section.items.map((item) => {
              const itemPosition = positions.get(item)
              const entry = item.entry
              const zone = item.kind === 'zone' ? item.zone : displayZone(entry)
              const description = describeEntry(entry)
              const sideNote = item.kind === 'zone' && (zone.side === 'left' || zone.side === 'right')
                ? ` · ${zone.side === 'left' ? 'Left' : 'Right'}`
                : ''
              const showMatch = item.matchText
                && !description.toLowerCase().includes(item.matchText.toLowerCase())
                && !entry.name.toLowerCase().includes(item.matchText.toLowerCase())

              return (
                <li
                  key={`${section.id}-${item.kind}-${zone?.id ?? entry.name}`}
                  id={optionId(itemPosition)}
                  role="option"
                  aria-selected={itemPosition === safeActive}
                  className={[
                    'search-option',
                    itemPosition === safeActive ? 'is-active' : '',
                    selectedZone && entry.name === selectedZone.locationName ? 'is-current' : '',
                  ].join(' ')}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActiveIndex(itemPosition)}
                  onClick={() => choose(item)}
                >
                  <LocatorThumb
                    zone={zone}
                    face={faceFor(entry)}
                  />

                  <span className="search-option-text">
                    <span className="search-option-name">{entry.name}</span>
                    <span className="search-option-description">
                      {description}
                      {sideNote}
                    </span>
                    {showMatch && (
                      <span className="search-option-match">
                        Also called “{item.matchText}”
                      </span>
                    )}
                  </span>

                  <ChevronRightIcon
                    className="search-option-chevron"
                    size={18}
                  />
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )

  const sideStepView = sideStep && (
    <div
      className="search-side-step"
      role="group"
      aria-labelledby={`${baseId}-side-title`}
      onKeyDown={handleSideStepKeyDown}
    >
      <div className="search-option is-static">
        <LocatorThumb
          zone={displayZone(sideStep.entry)}
          face={faceFor(sideStep.entry)}
        />

        <span className="search-option-text">
          <span className="search-option-name">{sideStep.entry.name}</span>
          <span className="search-option-description">
            {describe(sideStep.entry.name).description}
          </span>
        </span>
      </div>

      <p
        id={`${baseId}-side-title`}
        className="side-step-title"
      >
        Choose the patient’s side
      </p>

      <div className="side-step-buttons">
        <button
          ref={rightButtonRef}
          type="button"
          className="button button-outline"
          aria-label={`Patient's right ${sideStep.entry.name}`}
          onClick={() => finish(zonesBySide(sideStep.entry).right)}
        >
          Right
        </button>

        <button
          type="button"
          className="button button-outline"
          aria-label={`Patient's left ${sideStep.entry.name}`}
          onClick={() => finish(zonesBySide(sideStep.entry).left)}
        >
          Left
        </button>
      </div>

      <button
        type="button"
        className="link-button side-step-back"
        onClick={backToResults}
      >
        <ChevronLeftIcon size={16} />
        Back to results
      </button>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={[
        'location-search',
        `location-search-${layout}`,
        showPanel ? 'is-open' : '',
      ].join(' ')}
      onBlur={handleBlur}
    >
      <div className="search-bar">
        <div className="search-control">
          <SearchIcon
            className="search-icon"
            size={20}
          />

          <label
            className="visually-hidden"
            htmlFor={`${baseId}-input`}
          >
            Find a body location
          </label>

          <input
            ref={inputRef}
            id={`${baseId}-input`}
            className="search-input"
            type="text"
            role="combobox"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            enterKeyHint="search"
            placeholder="Find a body location"
            aria-autocomplete="list"
            aria-expanded={showPanel && !sideStep}
            aria-controls={listId}
            aria-activedescendant={
              showPanel && !sideStep && safeActive >= 0
                ? optionId(safeActive)
                : undefined
            }
            disabled={disabled}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
              setActiveIndex(0)
              setSideStep(null)
            }}
            onFocus={(event) => {
              // Focus the app moves here itself (after New case or Clear)
              // is "quiet": the list stays closed until the learner types
              // or presses an arrow key.
              if (!event.currentTarget.dataset.quietFocus) setOpen(true)
            }}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />

          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery('')
                setSideStep(null)
                inputRef.current?.focus()
              }}
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>

        {layout === 'narrow' && showPanel && (
          <button
            type="button"
            className="search-cancel"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => reset({ blur: true })}
          >
            Cancel
          </button>
        )}
      </div>

      {showPanel && (
        <div className={`search-panel search-panel-${layout}${crampedCard ? ' is-cramped' : ''}`}>
          {layout === 'narrow' && (
            <div
              className="search-backdrop"
              aria-hidden="true"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => reset({ blur: true })}
            />
          )}

          <div
            ref={cardRef}
            className="search-card"
            style={cardStyle}
          >
            {sideStepView}

            <div hidden={Boolean(sideStep)}>
              <p
                className="visually-hidden"
                role="status"
              >
                {query.trim()
                  ? `${total} ${total === 1 ? 'location' : 'locations'}`
                  : ''}
              </p>

              {listbox}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
