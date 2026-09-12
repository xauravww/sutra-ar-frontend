import Image from "next/image";

export default function Logo({ className = "h-[30px] sm:h-9 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Sutra"
      width={1437}
      height={256}
      priority
      className={className}
    />
  );
}
