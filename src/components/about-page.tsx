import { useEffect, useRef, useState } from "react";
import { Copy, Download, RefreshCw, Share, Smartphone } from "lucide-react";
import { CARD_COUNT, DATA_META } from "@/data/catalog";
import { deviceKind, isStandalone, subscribeInstall, type BeforeInstall } from "@/lib/install";

const FEATURES = [
  { icon: "🔍", title: "極速搜查", body: "輸入武將名稱、卡號或計略字詞，即可查找卡牌。" },
  { icon: "🎛️", title: "篩選", body: "可按稀有度、兵種、計略類型等條件收窄結果。" },
  { icon: "📖", title: "繁體中文", body: "計略說明為繁體中文翻譯，不必為語言不通而煩惱。" },
  { icon: "⚡️", title: "對戰速查", body: "專為對戰準備時翻查而設，重點數值一眼可見。" },
] as const;

const PAGE_URL = "https://imazi3594.github.io/ek-scout/";

export function AboutPage() {
  const [installEvent, setInstallEvent] = useState<BeforeInstall | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosChrome, setIosChrome] = useState(false);
  const [android, setAndroid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [checking, setChecking] = useState(false);
  const noteTimer = useRef<number | null>(null);

  function showNote(text: string, persist = false) {
    if (noteTimer.current) window.clearTimeout(noteTimer.current);
    setUpdateNote(text);
    if (!persist) {
      noteTimer.current = window.setTimeout(() => {
        setUpdateNote("");
        noteTimer.current = null;
      }, 2400);
    }
  }

  useEffect(() => {
    return () => {
      if (noteTimer.current) window.clearTimeout(noteTimer.current);
    };
  }, []);

  useEffect(() => {
    setInstalled(isStandalone());
    const kind = deviceKind();
    setIos(kind.ios);
    setIosChrome(kind.iosChrome);
    setAndroid(kind.android);
    return subscribeInstall(setInstallEvent);
  }, []);

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") setInstalled(true);
      return;
    }
    if (iosChrome) {
      setHint("iPhone 的 Chrome 安裝後仍會顯示地址欄。若要隱藏 toolbar，請以 Safari 開啟並加到主畫面。");
      return;
    }
    if (ios) {
      setHint("按底欄分享鍵，再選「加到主畫面」。請勿使用 Chrome。");
      return;
    }
    if (android) {
      setHint("Chrome 右上 ⋮ → 選「安裝應用程式」。請勿選「加到主畫面」，該選項會保留地址欄。");
      return;
    }
    setHint("用 Chrome 右上 ⋮ →「安裝應用程式」。");
  }

  async function forceRefresh() {
    if (checking) return;
    if (!navigator.onLine) {
      showNote("目前沒有網絡");
      return;
    }
    if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }
    setChecking(true);
    showNote("正在檢查…", true);
    let settled = false;
    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", onControl);
      setChecking(false);
      showNote(text);
    };
    const onControl = () => {
      if (settled) return;
      settled = true;
      window.location.reload();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "updated" && data.reload) {
        settled = true;
        window.location.reload();
        return;
      }
      if (data.type === "update-result") finish(data.ok ? "已是最新版本" : "暫時無法更新");
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    navigator.serviceWorker.addEventListener("controllerchange", onControl);
    window.setTimeout(() => finish("暫時無法更新"), 25000);
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
      if (reg.waiting) reg.waiting.postMessage({ type: "skip-wait" });
      reg.active?.postMessage({ type: "revalidate", force: true });
    } catch {
      finish("暫時無法更新");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PAGE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setHint(PAGE_URL);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
      {updateNote ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[max(0.6rem,env(safe-area-inset-top))]">
          <p role="status" className="rounded-full bg-black/85 px-4 py-2 text-sm text-fg shadow-[var(--shadow-border)]">
            {updateNote}
          </p>
        </div>
      ) : null}
      <div className="flex flex-col items-center text-center">
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
          alt=""
          width={96}
          height={96}
          className="size-24 rounded-3xl shadow-[var(--shadow-border)]"
        />
        <div className="mt-4 flex items-center gap-2">
          <h2 className="font-display text-2xl tracking-tight">英傑大戦⚡️速查</h2>
        </div>
        <p className="mt-2 text-sm text-muted">對戰用口袋手冊</p>
        <p className="mt-1 text-sm tabular-nums text-muted">收錄卡牌 {CARD_COUNT} 張</p>
      </div>

      <ul className="mt-6 flex flex-col gap-2.5">
        {FEATURES.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/35 px-3.5 py-3.5"
          >
            <span className="w-7 shrink-0 text-center text-lg leading-6" aria-hidden>
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-lg border border-white/10 bg-black/35 p-4">
        <p className="flex items-center gap-2 text-xs text-faint">
          <Smartphone className="size-3.5" />
          安裝為獨立 App
        </p>
        {installed ? (
          <p className="mt-3 text-sm text-fg">目前已是獨立畫面。之後由主畫面閃電圖示開啟即可。</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void install()}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-black bg-cost font-medium text-black"
            >
              <Download className="size-4" />
              安裝到手機以離線瀏覽
            </button>
            {hint ? <p className="mt-3 text-sm leading-relaxed text-pretty text-fg">{hint}</p> : null}

            {iosChrome ? (
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
                <p className="text-fg">iPhone Chrome 無法隱藏 toolbar。請改用 Safari：</p>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-surface-2 text-fg"
                >
                  <Copy className="size-4" />
                  {copied ? "已複製網址" : "複製網址"}
                </button>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>打開 Safari，貼上網址</li>
                  <li>
                    按底欄
                    <Share className="mx-1 inline size-3.5 align-[-2px]" />
                    分享
                  </li>
                  <li>選「加到主畫面」→「加入」</li>
                </ol>
              </div>
            ) : ios ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
                <li>
                  按 Safari 底欄
                  <Share className="mx-1 inline size-3.5 align-[-2px]" />
                  分享
                </li>
                <li>向上滑，選「加到主畫面」</li>
                <li>右上角「加入」。由主畫面閃電圖示開啟即無地址欄。</li>
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                安裝後可享全螢幕更佳體驗。
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-white/10 bg-black/35 p-4 text-sm leading-relaxed text-pretty text-muted">
        <p className="text-xs text-faint">資料版本</p>
        <p className="mt-2 text-fg">英傑大戦 Ver.{DATA_META.gameVer}</p>
        <p className="mt-2">{DATA_META.pack}</p>
        <p className="mt-2 tabular-nums">
          遊戲更新 {DATA_META.gameDate.replaceAll("-", "/")}
          <br />
          資料擷取 {DATA_META.dataDate.replaceAll("-", "/")}
        </p>
        <button
          type="button"
          onClick={() => void forceRefresh()}
          disabled={checking}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-surface-2 font-medium text-fg disabled:opacity-60"
        >
          <RefreshCw className="size-4" />
          檢查更新
        </button>
      </section>

      <section className="mt-4 rounded-lg border border-white/10 bg-black/35 p-4 text-sm leading-relaxed text-pretty text-muted">
        <p className="text-xs text-faint">Credit</p>
        <p className="mt-2 text-fg">Grok（xAI）設計與製作</p>
        <p className="mt-3">
          數值整理及翻譯自{" "}
          <a className="text-fg underline decoration-border underline-offset-2" href="https://eiketsudb.com/" target="_blank" rel="noreferrer">
            英傑大戦データベース
          </a>
          {" "}與{" "}
          <a className="text-fg underline decoration-border underline-offset-2" href="https://w.atwiki.jp/eiketsu-taisen/" target="_blank" rel="noreferrer">
            英傑大戦wiki
          </a>
          ，對戰時不必另開網頁翻查。
        </p>
        <p className="mt-3">英傑大戦為 SEGA 的遊戲。此為玩家自用速查，與官方無關。</p>
      </section>
    </div>
  );
}
