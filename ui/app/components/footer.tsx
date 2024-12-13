import Image from "next/image";

export default function Footer() {
  return (
    <div className="col-span-7 h-[30px] w-full bg-lm-dark-gray flex items-center justify-between px-2">
      <div className="flex items-center gap-2  h-[20px]">
        <div className="flex items-baseline gap-1">
          <span>LIVE</span>
          <div className="rounded border w-[10px] h-[10px] bg-[green]" />
        </div>
      </div>
      <div className="flex items-center gap-2 h-[20px]">
        <a href="https://x.com/AiAgentkAia" target="_blank">
          <Image alt="twitter img" src="/x.webp" width={30} height={30} />
        </a>
        <a
          href="https://dexscreener.com/solana/behrfjj1xpfwdstcseu7sjkdymw9knham11fbgmpgprg"
          target="_blank"
        >
          <Image
            alt="dexscreener img"
            src="/dexscreener.png"
            width={20}
            height={20}
          />
        </a>
      </div>
    </div>
  );
}
