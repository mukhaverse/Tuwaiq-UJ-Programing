import { motion } from "motion/react";

const roll = {
  rest: { y: "0%" },
  hover: { y: "-50%", transition: { type: "spring", stiffness: 420, damping: 26 } },
};

/* The label is printed twice; on hover the stack slides up so the copy rolls into place. */
export function RollText({ children }) {
  return (
    <span className="roll">
      <motion.span className="roll__inner" variants={roll}>
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </motion.span>
    </span>
  );
}

export default function Pill({ as = "a", variant = "", big = false, icon, children, className = "", ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      className={`pill ${variant ? `pill--${variant}` : ""} ${big ? "pill--big" : ""} ${className}`}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.95 }}
      {...rest}
    >
      {icon}
      <RollText>{children}</RollText>
    </Tag>
  );
}
