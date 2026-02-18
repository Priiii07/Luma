import { useDroppable } from '@dnd-kit/core'

function DroppableCalendarDay({ dateStr, children }) {
    const { isOver, setNodeRef } = useDroppable({
        id: `day-${dateStr}`,
        data: { dateStr }
    })

    return (
        <div ref={setNodeRef} className={`${isOver ? 'ring-2 ring-purple-400 ring-inset rounded-lg' : ''}`}>
            {children}
        </div>
    )
}

export default DroppableCalendarDay
