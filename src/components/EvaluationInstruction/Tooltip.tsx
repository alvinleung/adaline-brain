import React, { useState, ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div style={{ position: "relative" }} className="cursor-default">
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      {showTooltip && (
        <div
          style={{
            zIndex: 1000,
            position: "absolute",
            top: "100%",
            left: "50%",
            fontSize: 14,
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "0.5rem",
            borderRadius: "4px",
            width: "30ch",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
