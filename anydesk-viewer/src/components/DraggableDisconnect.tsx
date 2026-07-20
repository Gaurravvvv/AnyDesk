import { useState, useRef, useEffect } from 'react';

interface DraggableDisconnectProps {
  onDisconnect: () => void;
}

export function DraggableDisconnect({ onDisconnect }: DraggableDisconnectProps) {
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPosition = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPosition.current = { x: position.x, y: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    let newX = initialPosition.current.x + deltaX;
    let newY = initialPosition.current.y + deltaY;

    // Bounds checking
    const btnWidth = 56; // w-14
    const btnHeight = 56; // h-14
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX > window.innerWidth - btnWidth) newX = window.innerWidth - btnWidth;
    if (newY > window.innerHeight - btnHeight) newY = window.innerHeight - btnHeight;

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    // If it was just a click (moved less than 5px), trigger disconnect
    const moveDistance = Math.hypot(
      e.clientX - dragStart.current.x,
      e.clientY - dragStart.current.y
    );

    if (moveDistance < 5) {
      onDisconnect();
    }
  };

  // Handle window resize to keep button in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        if (newX > window.innerWidth - 56) newX = window.innerWidth - 56;
        if (newY > window.innerHeight - 56) newY = window.innerHeight - 56;
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      // Prevent focus stealing from the main view container
      onFocus={(e) => e.target.blur()} 
      className={`fixed z-50 w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 shadow-xl flex items-center justify-center transition-transform ${
        isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-105 cursor-grab'
      }`}
      style={{
        left: position.x,
        top: position.y,
        touchAction: 'none'
      }}
      title="Disconnect (Drag to move)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 text-white"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
      </svg>
    </button>
  );
}
