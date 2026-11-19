import { forwardRef, useId, useRef } from 'react'
import { CheckIcon } from '../icons'
import EditorSurface from './EditorSurface'

/*
 * One case detail with a few fixed choices (onset, swelling). Up/Down move
 * between the choices; Enter, Space or a click picks one, which applies it
 * immediately and closes the editor (like a drop-down list).
 */
const ChoiceEditor = forwardRef(function ChoiceEditor({
  layout,
  title,
  subtitle,
  anchor,
  keyboardInset,
  value,
  choices,
  note,
  onChange,
  onClose,
}, ref) {
  const listId = useId()
  const listRef = useRef(null)
  const selectedRef = useRef(null)

  function moveFocus(event) {
    const items = [...listRef.current.querySelectorAll('[role="option"]')]
    const index = items.indexOf(document.activeElement)

    let next = null

    if (event.key === 'ArrowDown') next = items[Math.min(items.length - 1, index + 1)]
    if (event.key === 'ArrowUp') next = items[Math.max(0, index - 1)]
    if (event.key === 'Home') next = items[0]
    if (event.key === 'End') next = items[items.length - 1]

    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  function pick(choice) {
    onChange(choice.value)
    onClose()
  }

  return (
    <EditorSurface
      ref={ref}
      layout={layout}
      title={title}
      subtitle={subtitle}
      anchor={anchor}
      keyboardInset={keyboardInset}
      initialFocusRef={selectedRef}
      onClose={onClose}
    >
      <div
        ref={listRef}
        id={listId}
        className="choice-list"
        role="listbox"
        aria-label={title}
        onKeyDown={moveFocus}
      >
        {choices.map((choice) => {
          const selected = choice.value === value

          return (
            <div
              key={choice.value}
              ref={selected ? selectedRef : undefined}
              className={`choice-option${selected ? ' is-selected' : ''}`}
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => pick(choice)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  pick(choice)
                }
              }}
            >
              <span className="choice-text">
                <span className="choice-label">{choice.label}</span>
                {choice.description && (
                  <span className="choice-description">{choice.description}</span>
                )}
              </span>

              <span
                className="choice-check"
                aria-hidden="true"
              >
                {selected && <CheckIcon size={18} />}
              </span>
            </div>
          )
        })}
      </div>

      {note && <p className="editor-note">{note}</p>}
    </EditorSurface>
  )
})

export default ChoiceEditor
