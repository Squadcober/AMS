import Image from "next/image";

export default function Logo({ size = 64, alt = "App Logo", className = "" }) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
