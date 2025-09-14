// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
// 超シンプル版クローラ（毎日JSONを上書き）
// ・まずは「ダミーURL」のままでも動きます（空リストを出力）
// ・あとで TARGETS に“実際の一覧ページURL”を足していけばOK
// ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const TARGETS = [
  // ★あとでここに「ワイン一覧ページのURL」を入れていく
  // 例: "https://example.com/yaoko/import-wines/white"
];

const UA = "YaokoWinesCrawler/1.0 (+contact on your site)";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ▼ サイト構造に合わせて、ここを微調整（最初は仮のセレクタでOK）
function parseListHTML(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];

  // 例: 商品カードごとのブロック
  const $cards = $(".productItem, .c-product-card, .product-list .item");
  $cards.each((_, el) => {
    const $el = $(el);

    // 例: 商品名
    const name = $el.find(".productName, .c-product-card__name, .item-name, h3, .title").first().text().trim();

    // 例: 商品リンク
    let href = $el.find("a").first().attr("href") || "";
    if (href) {
      try { href = new URL(href, baseUrl).toString(); } catch {}
    }

    // 例: 画像
    let img = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src") || "";
    if (img) {
      try { img = new URL(img, baseUrl).toString(); } catch {}
    }

    if (name) {
      items.push({
        id: Buffer.from((href || name)).toString("base64").slice(0,16),
        name,
        yaoko_url: href || "",
        ns_url: "",
        image_url: img || "",
        country: "",
        color: "",
        grape: ""
      });
    }
  });

  return items;
}

async function crawlList(url){
  const res = await fetch(url, { headers: { "User-Agent": UA }});
  const html = await res.text();
  return parseListHTML(html, url);
}

async function main(){
  const all = [];
  for(const u of TARGETS){
    try{
      const items = await crawlList(u);
      all.push(...items);
      await sleep(800); // 負荷を下げるためのウェイト
    }catch(e){
      console.error("Failed:", u, e);
    }
  }

  // 重複排除
  const uniq = Object.values(Object.fromEntries(all.map(x => [x.id, x])));

  const out = {
    updated_at: new Date().toISOString(),
    items: uniq
  };

  // data フォルダを作ってJSONを書き出し
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync("data/wines.json", JSON.stringify(out, null, 2), "utf-8");
  console.log("Saved:", uniq.length, "items");
}
main();
