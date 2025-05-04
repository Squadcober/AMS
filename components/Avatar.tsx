import Image from "next/image";

export default function Avatar({ src, alt = "User Avatar", size = 40, className = "" }) {
  return (
    <Image
      src={src || "/logo.png"}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
