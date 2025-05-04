import Image from "next/image";

export default function ImagePlaceholder({ size = 80, className = "" }) {
  return (
    <Image
      src="/logo.png"
      alt="Placeholder"
      width={size}
      height={size}
      className={`opacity-40 rounded-full ${className}`}
    />
  );
}
