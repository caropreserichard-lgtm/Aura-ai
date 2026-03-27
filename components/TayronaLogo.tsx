"use client";

export default function TayronaLogo({ size = 80 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/tayrona-logo.png"
      alt="Tayrona AI"
      width={size}
      height={size}
      style={{ objectFit: "contain", width: size, height: size }}
    />
  );
}
