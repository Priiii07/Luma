import { useDraggable } from '@dnd-kit/core'

function DraggableTask({ task, children, disabled = false }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `task-${task.id}`,
        data: { task },
        disabled
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
            {...(disabled ? {} : listeners)}
            {...(disabled ? {} : attributes)}
            className={`${isDragging ? 'shadow-xl' : ''} ${disabled ? '' : 'touch-none'}`}
        >
            {children}
        </div>
    )
}

export default DraggableTask
