import Image from "next/image";

type AvatarProps = {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
};

export default function Avatar({ src, alt = "User Avatar", size = 40, className = "" }: AvatarProps) {
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
