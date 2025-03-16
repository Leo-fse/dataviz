"use client";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

function LinkTab({ label, href, selected }) {
  const router = useRouter();

  return (
    <Tab
      label={label}
      onClick={(event) => {
        event.preventDefault(); // デフォルトのリンク動作を防ぐ
        router.push(href); // Next.js のページ遷移を実行
      }}
      aria-current={selected ? "page" : undefined}
    />
  );
}

LinkTab.propTypes = {
  label: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  selected: PropTypes.bool,
};

export default function NavTabs() {
  const router = useRouter();
  const pathname = usePathname(); // 現在のURLパスを取得

  // タブとページの対応表
  const tabRoutes = ["/", "/graphviz", "/d3js"];
  // 現在のURLから対応するタブのインデックスを取得（存在しない場合は0にする）
  const initialIndex =
    tabRoutes.indexOf(pathname) !== -1 ? tabRoutes.indexOf(pathname) : 0;

  const [value, setValue] = useState(initialIndex);

  useEffect(() => {
    setValue(initialIndex); // URL変更時にタブの状態を更新
  }, [pathname]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    router.push(tabRoutes[newValue]); // タブ変更時にページ遷移
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="nav tabs example"
        role="navigation"
      >
        <LinkTab label="Home" href="/" selected={value === 0} />
        <LinkTab label="Graphviz" href="/graphviz" selected={value === 1} />
        <LinkTab label="D3.js" href="/d3js" selected={value === 2} />
      </Tabs>
    </Box>
  );
}
