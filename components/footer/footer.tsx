"use client";
import Image from "next/image";
import Text from "../text";
import styles from "./footer.module.scss";
import { useEffect, useState } from "react";
import { getTokenPriceInUSDC } from "@/utils/tokens";
import { useBlockNumber } from "wagmi";
import { CANTO_MAINNET_EVM } from "@/config/networks";
import Analytics from "@/provider/analytics";

const Footer = () => {
  const [cantoPrice, setCantoPrice] = useState("0");
  const [notePrice, setNotePrice] = useState("0");

  async function getTokenPrices() {
    // canto will use WCANTO address
    const [priceCanto, priceNote] = await Promise.all([
      getTokenPriceInUSDC("0x826551890Dc65655a0Aceca109aB11AbDbD7a07B", 18),
      getTokenPriceInUSDC("0x4e71A2E537B7f9D9413D3991D37958c0b5e1e503", 18),
    ]);
    if (!priceCanto.error) {
      setCantoPrice(priceCanto.data);
    }
    if (!priceNote.error) {
      setNotePrice(priceNote.data);
    }
  }
  useEffect(() => {
    getTokenPrices();
  }, []);
  return (
    <div className={styles.container}>
      <div className={styles.links}>
        <FooterLink
          href="https://github.com/althea-net/althea-whitepaper/blob/master/whitepaper.pdf"
          text="docs"
        />
        <FooterLink href="https://discord.gg/CmdEA2ArVJ" text="Discord" />
        <FooterLink href="https://twitter.com/altheanetwork" text="twitter" />
        <FooterLink href="https://medium.com/althea-mesh" text="Blog" />
        {/* <FooterButton text="theme" /> */}
      </div>
      <div className={styles.links}>
        <StatusText />
        <Text
          className={styles.item}
          size="x-sm"
          font="macan-font"
          style={{
            padding: "0 14px",
          }}
        >
          {/*<Image
            src="/althea.png"
            alt=""
            height={24}
            width={24}
            style={{
              margin: "8px",
            }}
          />{" "}
           ${cantoPrice} */}
        </Text>
      </div>
    </div>
  );
};

interface PropLink {
  href: string;
  text: string;
}
const FooterLink = ({ href, text }: PropLink) => {
  return (
    <Text size="x-sm" font="macan-font" className={styles.link}>
      <a
        href={href}
        target="_blank"
        onClick={() =>
          Analytics.actions.events.externalLinkClicked({
            Website: text,
          })
        }
        rel="noreferrer"
      >
        {text}
      </a>
    </Text>
  );
};

const StatusText = () => {
  const { data: blockNumber } = useBlockNumber({
    chainId: CANTO_MAINNET_EVM.chainId,
    watch: true,
  });

  const [blockString, setBlockString] = useState("Loading....");
  useEffect(() => {
    setBlockString(blockNumber?.toString() ?? "Loading....");
  }, [blockNumber?.toString()]);
  return (
    <Text
      size="x-sm"
      font="macan-font"
      className={styles.item}
      style={{
        width: "160px",
        justifyContent: "center",
      }}
    >
      <span className={styles.status}></span>
      {blockString}
    </Text>
  );
};
export default Footer;
