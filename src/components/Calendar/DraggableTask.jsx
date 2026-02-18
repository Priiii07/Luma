import { useDraggable } from '@dnd-kit/core'

function DraggableTask({ task, children }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `task-${task.id}`,
        data: { task }
    })

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: 9999,
            position: 'relative',
            opacity: 0.7,
        }
        : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`${isDragging ? 'shadow-xl' : ''} touch-none`}
        >
            {children}
        </div>
    )
}

export default DraggableTask
